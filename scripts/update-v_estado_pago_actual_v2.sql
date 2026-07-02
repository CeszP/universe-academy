-- Versión avanzada: cuenta meses adeudados por cada inscripción y muestra días cuando no hay meses completos adeudados
-- Ejecutar en Supabase SQL Editor (o psql) como administrador

CREATE OR REPLACE VIEW public.v_estado_pago_actual AS
SELECT
  e.id AS estudiante_id,
  e.nombre,
  e.apellidos,
  e.activo,
  e.terminal_person_id,
  -- acceso_permitido: hay pago marcado como pagado para el año/mes actuales?
  (EXISTS (
    SELECT 1 FROM public.pagos p
    WHERE p.estudiante_id = e.id
      AND p.pagado = true
      AND p.anio = EXTRACT(YEAR FROM CURRENT_DATE)::smallint
      AND p.mes = EXTRACT(MONTH FROM CURRENT_DATE)::smallint
  )) AS acceso_permitido,
  EXTRACT(YEAR FROM CURRENT_DATE)::smallint AS anio_actual,
  EXTRACT(MONTH FROM CURRENT_DATE)::smallint AS mes_actual,
  -- Última fecha de pago registrada (si existe)
  (SELECT MAX(p.fecha_pago::date) FROM public.pagos p WHERE p.estudiante_id = e.id AND p.pagado = true) AS last_payment_date,

  -- months_overdue: suma de meses impagos por cada inscripción activa
  (
    SELECT COALESCE(SUM(
      GREATEST(0,
        (
          -- meses transcurridos desde fecha_inicio hasta mes actual (cuenta meses completos que ya vencieron)
          ( (date_part('year', CURRENT_DATE) - date_part('year', i.fecha_inicio::date)) * 12
            + (date_part('month', CURRENT_DATE) - date_part('month', i.fecha_inicio::date))
          )::int
          + CASE WHEN date_part('day', CURRENT_DATE) >= LEAST(EXTRACT(DAY FROM i.fecha_inicio::date)::int,
              EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
            THEN 1 ELSE 0 END
          -- meses pagados para esta inscripción (pagos distintos por anio/mes)
          - COALESCE((SELECT COUNT(DISTINCT (p.anio || '-' || p.mes)) FROM public.pagos p WHERE p.inscripcion_id = i.id AND p.pagado = true),0)
        )
      )
    ),0)
    FROM public.inscripciones i
    WHERE i.estudiante_id = e.id AND i.activa = true
  )::int AS months_overdue,

  -- days_overdue: si hay meses_overdue > 0 -> NULL; si no -> días desde la fecha de vencimiento más próxima que ya pasó (si existe)
  (
    SELECT CASE WHEN SUMC.months > 0 THEN NULL ELSE COALESCE(DAYS.days, 0) END
    FROM (
      SELECT COALESCE(SUM(
        GREATEST(0,
          (
            ( (date_part('year', CURRENT_DATE) - date_part('year', i.fecha_inicio::date)) * 12
              + (date_part('month', CURRENT_DATE) - date_part('month', i.fecha_inicio::date))
            )::int
            + CASE WHEN date_part('day', CURRENT_DATE) >= LEAST(EXTRACT(DAY FROM i.fecha_inicio::date)::int,
                EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int)
              THEN 1 ELSE 0 END
            - COALESCE((SELECT COUNT(DISTINCT (p.anio || '-' || p.mes)) FROM public.pagos p WHERE p.inscripcion_id = i.id AND p.pagado = true),0)
          )
        )
      ),0) AS months
      FROM public.inscripciones i
      WHERE i.estudiante_id = e.id AND i.activa = true
    ) AS SUMC
    CROSS JOIN LATERAL (
      -- days: encontrar la fecha de vencimiento en el mes actual para inscripciones activas que aún no han pagado este mes
      SELECT MAX( (CURRENT_DATE - due)::int ) AS days
      FROM (
        SELECT (
          (
            make_date(
              EXTRACT(YEAR FROM CURRENT_DATE)::int,
              EXTRACT(MONTH FROM CURRENT_DATE)::int,
              LEAST(
                EXTRACT(DAY FROM i.fecha_inicio::date)::int,
                EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int
              )
            )
          )::date
          + CASE WHEN (
            (
              make_date(
                EXTRACT(YEAR FROM CURRENT_DATE)::int,
                EXTRACT(MONTH FROM CURRENT_DATE)::int,
                LEAST(
                  EXTRACT(DAY FROM i.fecha_inicio::date)::int,
                  EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int
                )
              )
            )::date <= CURRENT_DATE
          ) THEN 0 ELSE 0 END
        ) AS due
        FROM public.inscripciones i
        WHERE i.estudiante_id = e.id AND i.activa = true
          AND NOT EXISTS (
            SELECT 1 FROM public.pagos p
            WHERE p.inscripcion_id = i.id
              AND p.anio = EXTRACT(YEAR FROM CURRENT_DATE)::smallint
              AND p.mes = EXTRACT(MONTH FROM CURRENT_DATE)::smallint
              AND p.pagado = true
          )
      ) as DUEs
    ) AS DAYS
  )::int AS days_overdue,

  -- Última actualización combinada
  GREATEST(
    e.updated_at::timestamp,
    COALESCE((SELECT MAX(c.updated_at::timestamp) FROM public.cargos_especiales c WHERE c.estudiante_id = e.id), e.updated_at::timestamp),
    COALESCE((SELECT MAX(p2.updated_at::timestamp) FROM public.pagos p2 WHERE p2.estudiante_id = e.id), e.updated_at::timestamp)
  ) AS last_updated
FROM public.estudiantes e;

-- Nota: las consultas usan `inscripciones.fecha_inicio` como referencia del día de facturación.
-- Prueba con registros reales y ajusta según reglas (p.ej. due_day por plan).
