-- Seed de planes con los precios actualizados 2026
-- Ejecutar en Supabase SQL editor o con psql contra la base de datos.

CREATE UNIQUE INDEX IF NOT EXISTS idx_planes_nombre_unique ON planes(nombre);

INSERT INTO planes (nombre, descripcion, monto, activo)
VALUES
  ('Dance Moms', '3 hrs a la semana · 400 MXN (200 si tienes hijos inscritos)', 400.00, TRUE),
  ('Funcional y Hit', '5 hrs a la semana · 400 MXN', 400.00, TRUE),
  ('Jazz', '3 hrs a la semana · 470 MXN', 470.00, TRUE),
  ('Hip hop', '3 hrs a la semana · 470 MXN', 470.00, TRUE),
  ('Baby Ballet', '2 hrs a la semana · 470 MXN', 470.00, TRUE),
  ('Ballet +7', '2 hrs a la semana · 570 MXN', 570.00, TRUE),
  ('Gimnasia Fitnes', '3 hrs a la semana · 570 MXN', 570.00, TRUE),
  ('DA', '3 hrs a la semana · 570 MXN', 570.00, TRUE),
  ('Gimnasia babys', '3 hrs a la semana · 580 MXN', 580.00, TRUE),
  ('Gimnasia Artística', '3 hrs a la semana · 680 MXN', 680.00, TRUE)
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    monto = EXCLUDED.monto,
    activo = EXCLUDED.activo;

-- Notas:
-- 1) La tabla planes funciona bien para planes mensuales.
-- 2) Las tarifas de inscripción, clase suelta y clase extra son cargos puntuales
--    y no están modelados actualmente como pagos mensuales en el flujo de Pagos.
--    Si quieres que esos cargos se registren aquí, conviene manejarlo como cargos
--    especiales o añadir otra tabla/columna para distinguir pagos periódicos de únicos.
