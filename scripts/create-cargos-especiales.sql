-- Crear tabla para cargos especiales (inscripción, clase suelta, clase extra)
-- Ejecutar en Supabase SQL editor o con psql contra la base de datos.

CREATE TABLE cargos_especiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('inscripcion','clase_suelta','clase_extra')),
  descripcion TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  pagado BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_cargo DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_pago DATE,
  metodo_pago TEXT DEFAULT 'efectivo',
  referencia_externa TEXT,
  registrado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cargos_especiales_updated
  BEFORE UPDATE ON cargos_especiales FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE cargos_especiales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_full_access" ON cargos_especiales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_cargos_especiales_estudiante ON cargos_especiales(estudiante_id);
CREATE INDEX idx_cargos_especiales_pagado ON cargos_especiales(pagado);
