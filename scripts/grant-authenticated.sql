-- Otorga permisos de tabla al rol authenticated para evitar errores 42501
-- Ejecutar en Supabase SQL editor o con psql contra la base de datos.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- Si usas funciones definidas por el usuario y quieres que el rol authenticated las ejecute:
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
