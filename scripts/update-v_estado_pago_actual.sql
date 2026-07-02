-- Reemplaza la vista v_estado_pago_actual para incluir últimas fechas y días de atraso
-- Ejecutar en Supabase SQL Editor (o psql) como administrador

-- IMPORTANTE: Si la vista existe con columnas distintas, PostgreSQL puede rechazar
-- CREATE OR REPLACE. Para evitar el error 42P16, eliminamos la vista primero.
DROP VIEW IF EXISTS public.v_estado_pago_actual;

CREATE OR REPLACE VIEW public.v_estado_pago_actual AS
SELECT
  e.id AS estudiante_id,
  e.nombre,
  e.apellidos,
  e.activo,
  e.terminal_person_id,
  -- acceso_permitido: todas las inscripciones activas están pagadas para el mes/año actual?
  NOT EXISTS (
    SELECT 1 FROM public.inscripciones i
    WHERE i.estudiante_id = e.id
      AND i.activa = true
      AND NOT EXISTS (
        SELECT 1 FROM public.pagos p
        WHERE p.inscripcion_id = i.id
          AND p.pagado = true
          AND p.anio = EXTRACT(YEAR FROM CURRENT_DATE)::int
          AND p.mes = EXTRACT(MONTH FROM CURRENT_DATE)::int
      )
  ) AS acceso_permitido,
  EXTRACT(YEAR FROM CURRENT_DATE)::smallint AS anio_actual,
  EXTRACT(MONTH FROM CURRENT_DATE)::smallint AS mes_actual,
  -- Última fecha de pago registrada (si existe)
  (SELECT MAX(p.fecha_pago::date) FROM public.pagos p WHERE p.estudiante_id = e.id AND p.pagado = true) AS last_payment_date,
  -- Calcular `months_overdue` y `days_overdue` SOLO si existe al menos una inscripción activa.
  -- Si no hay inscripción activa, `months_overdue = 0` y `days_overdue = NULL`.
  CASE
    WHEN EXISTS (SELECT 1 FROM public.inscripciones i WHERE i.estudiante_id = e.id AND i.activa = true)
    THEN (
      -- months_overdue aproximado: meses transcurridos desde la primera inscripción activa
      (SELECT GREATEST(0, (
        (EXTRACT(YEAR FROM CURRENT_DATE)::int - EXTRACT(YEAR FROM MIN(i.fecha_inicio::date))::int) * 12
        + (EXTRACT(MONTH FROM CURRENT_DATE)::int - EXTRACT(MONTH FROM MIN(i.fecha_inicio::date))::int)
      ))::int FROM public.inscripciones i WHERE i.estudiante_id = e.id AND i.activa = true)
    )
    ELSE 0
  END AS months_overdue,
  CASE
    WHEN EXISTS (SELECT 1 FROM public.inscripciones i WHERE i.estudiante_id = e.id AND i.activa = true)
    THEN (
      -- Días de atraso: si hay pago en el mes actual -> 0; si no, calcular respecto a la próxima fecha de vencimiento
      CASE
        WHEN EXISTS (
          SELECT 1 FROM public.pagos p
          WHERE p.estudiante_id = e.id
            AND p.pagado = true
            AND p.anio = EXTRACT(YEAR FROM CURRENT_DATE)::smallint
            AND p.mes = EXTRACT(MONTH FROM CURRENT_DATE)::smallint
        ) THEN 0
        ELSE (
          -- Tomar día de vencimiento: día de la última inscripción activa (fecha_inicio)
          SELECT GREATEST(0, (CURRENT_DATE - (
            (
              make_date(
                EXTRACT(YEAR FROM CURRENT_DATE)::int,
                EXTRACT(MONTH FROM CURRENT_DATE)::int,
                LEAST(
                  COALESCE(EXTRACT(DAY FROM MAX(i.fecha_inicio::date)), EXTRACT(DAY FROM e.created_at::date))::int,
                  EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int
                )
              )
            )::date
            + CASE WHEN (
                make_date(
                  EXTRACT(YEAR FROM CURRENT_DATE)::int,
                  EXTRACT(MONTH FROM CURRENT_DATE)::int,
                  LEAST(
                    COALESCE(EXTRACT(DAY FROM MAX(i.fecha_inicio::date)), EXTRACT(DAY FROM e.created_at::date))::int,
                    EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int
                  )
                )
              )::date <= CURRENT_DATE THEN INTERVAL '1 month' ELSE INTERVAL '0' END
          )::date))::int
          FROM public.inscripciones i
          WHERE i.estudiante_id = e.id AND i.activa = true
        )
      END
    )
    ELSE NULL
  END AS days_overdue,
  -- Monto adeudado por inscripciones del mes actual sin pagar
  COALESCE((
    SELECT SUM(pl.monto)
    FROM public.inscripciones i
    JOIN public.planes pl ON i.plan_id = pl.id
    WHERE i.estudiante_id = e.id 
      AND i.activa = true
      AND NOT EXISTS (
        SELECT 1 FROM public.pagos p
        WHERE p.inscripcion_id = i.id
          AND p.pagado = true
          AND p.anio = EXTRACT(YEAR FROM CURRENT_DATE)::int
          AND p.mes = EXTRACT(MONTH FROM CURRENT_DATE)::int
      )
  ), 0)::numeric(10,2) AS inscripciones_monto_pendiente,
  -- Cargos especiales pendientes: suma y conteo (se muestran aun si no hay inscripciones)
  COALESCE((SELECT SUM(c.monto) FROM public.cargos_especiales c WHERE c.estudiante_id = e.id AND c.pagado = false), 0)::numeric(10,2) AS cargos_especiales_total_pendiente,
  COALESCE((SELECT COUNT(*) FROM public.cargos_especiales c WHERE c.estudiante_id = e.id AND c.pagado = false), 0) AS cargos_especiales_count_pendiente,
  -- Total adeudado: inscripciones + cargos especiales
  (
    COALESCE((
      SELECT SUM(pl.monto)
      FROM public.inscripciones i
      JOIN public.planes pl ON i.plan_id = pl.id
      WHERE i.estudiante_id = e.id 
        AND i.activa = true
        AND NOT EXISTS (
          SELECT 1 FROM public.pagos p
          WHERE p.inscripcion_id = i.id
            AND p.pagado = true
            AND p.anio = EXTRACT(YEAR FROM CURRENT_DATE)::int
            AND p.mes = EXTRACT(MONTH FROM CURRENT_DATE)::int
        )
    ), 0) 
    + 
    COALESCE((SELECT SUM(c.monto) FROM public.cargos_especiales c WHERE c.estudiante_id = e.id AND c.pagado = false), 0)
  )::numeric(10,2) AS monto_total_adeudado,
  -- Última actualización combinada (estudiante, pagos, cargos especiales)
  GREATEST(
    e.updated_at::timestamp,
    COALESCE((SELECT MAX(c.updated_at::timestamp) FROM public.cargos_especiales c WHERE c.estudiante_id = e.id), e.updated_at::timestamp),
    COALESCE((SELECT MAX(p2.updated_at::timestamp) FROM public.pagos p2 WHERE p2.estudiante_id = e.id), e.updated_at::timestamp)
  ) AS last_updated
FROM public.estudiantes e;

-- Nota: si tus columnas `fecha_pago` / `updated_at` no son de tipo timestamp/date, ajusta los casts apropiadamente.
-- Para aplicar: copia este archivo y ejecútalo en el SQL editor de Supabase (Tools → SQL Editor → New query) o mediante psql.
