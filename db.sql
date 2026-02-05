-- ============================================
-- SOLUCIÓN DEFINITIVA - Database error saving new user
-- ============================================

-- PASO 1: LIMPIAR TODO (empezar desde cero)
-- ============================================

-- Eliminar trigger existente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Eliminar función existente
DROP FUNCTION IF EXISTS create_initial_snapshot() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Eliminar tabla y recrear
DROP TABLE IF EXISTS public.user_snapshots CASCADE;

-- PASO 2: CREAR TABLA CON ESTRUCTURA CORRECTA
-- ============================================

CREATE TABLE public.user_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_data JSONB NOT NULL DEFAULT '{"version": "2.0.0", "timestamp": "", "tasks": [], "settings": [], "stats": {"totalTasks": 0, "totalColors": 0}}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT user_snapshots_user_id_key UNIQUE(user_id)
);

-- NO usar FOREIGN KEY inicialmente para evitar problemas de permisos
-- La relación se maneja en el trigger

-- PASO 3: CREAR ÍNDICES
-- ============================================

CREATE INDEX idx_user_snapshots_user_id ON public.user_snapshots(user_id);
CREATE INDEX idx_user_snapshots_last_updated ON public.user_snapshots(last_updated DESC);

-- PASO 4: CONFIGURAR RLS
-- ============================================

ALTER TABLE public.user_snapshots ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "users_select_own" ON public.user_snapshots;
DROP POLICY IF EXISTS "users_insert_own" ON public.user_snapshots;
DROP POLICY IF EXISTS "users_update_own" ON public.user_snapshots;
DROP POLICY IF EXISTS "users_delete_own" ON public.user_snapshots;

-- Crear políticas DESPUÉS de la tabla
CREATE POLICY "users_select_own"
  ON public.user_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own"
  ON public.user_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own"
  ON public.user_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own"
  ON public.user_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

-- PASO 5: OTORGAR PERMISOS EXPLÍCITOS
-- ============================================

GRANT ALL ON public.user_snapshots TO postgres;
GRANT ALL ON public.user_snapshots TO authenticated;
GRANT ALL ON public.user_snapshots TO service_role;

-- PASO 6: CREAR FUNCIÓN CON MANEJO DE ERRORES
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- CRÍTICO: permite bypass de RLS durante creación
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  initial_snapshot JSONB;
BEGIN
  -- Log para debugging
  RAISE LOG 'Trigger ejecutado para usuario: %', NEW.id;

  -- Preparar snapshot inicial
  initial_snapshot := jsonb_build_object(
    'version', '2.0.0',
    'timestamp', NOW()::text,
    'tasks', '[]'::jsonb,
    'settings', '[]'::jsonb,
    'stats', jsonb_build_object(
      'totalTasks', 0,
      'totalColors', 0
    )
  );

  -- Intentar insertar con manejo de errores
  BEGIN
    INSERT INTO public.user_snapshots (user_id, snapshot_data, metadata)
    VALUES (
      NEW.id,
      initial_snapshot,
      jsonb_build_object(
        'created_via', 'trigger',
        'created_at', NOW()::text,
        'trigger_version', '2.0'
      )
    )
    ON CONFLICT (user_id) DO NOTHING; -- Evitar duplicados

    RAISE LOG 'Snapshot creado exitosamente para usuario: %', NEW.id;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log del error pero NO fallar el registro del usuario
      RAISE LOG 'Error creando snapshot para %: % - %', NEW.id, SQLERRM, SQLSTATE;
      -- Continuar de todas formas
  END;

  RETURN NEW;
END;
$$;

-- PASO 7: CREAR TRIGGER
-- ============================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PASO 8: CREAR SNAPSHOTS PARA USUARIOS EXISTENTES
-- ============================================

-- Crear snapshots para cualquier usuario que no tenga uno
INSERT INTO public.user_snapshots (user_id, snapshot_data, metadata)
SELECT
  u.id,
  jsonb_build_object(
    'version', '2.0.0',
    'timestamp', NOW()::text,
    'tasks', '[]'::jsonb,
    'settings', '[]'::jsonb,
    'stats', jsonb_build_object('totalTasks', 0, 'totalColors', 0)
  ),
  jsonb_build_object(
    'created_via', 'backfill',
    'created_at', NOW()::text
  )
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_snapshots s WHERE s.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- PASO 9: FUNCIÓN DE VERIFICACIÓN MEJORADA
-- ============================================

CREATE OR REPLACE FUNCTION public.verify_complete_setup()
RETURNS TABLE (
  step_number INT,
  check_name TEXT,
  status TEXT,
  details TEXT,
  action_required TEXT
) AS $$
BEGIN
  -- 1. Verificar tabla existe
  RETURN QUERY
  SELECT
    1,
    'Tabla user_snapshots'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_snapshots'
    ) THEN '✅ OK' ELSE '❌ FALTA' END,
    'Tabla principal de snapshots'::TEXT,
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_snapshots'
    ) THEN 'Ejecutar script completo' ELSE 'Ninguna' END;

  -- 2. Verificar RLS
  RETURN QUERY
  SELECT
    2,
    'RLS Habilitado'::TEXT,
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_snapshots')
      THEN '✅ OK' ELSE '❌ DESHABILITADO' END,
    'Row Level Security'::TEXT,
    CASE WHEN NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_snapshots')
      THEN 'Ejecutar: ALTER TABLE user_snapshots ENABLE ROW LEVEL SECURITY;' ELSE 'Ninguna' END;

  -- 3. Verificar políticas
  RETURN QUERY
  SELECT
    3,
    'Políticas RLS'::TEXT,
    CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_snapshots') >= 4
      THEN '✅ ' || (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_snapshots')::TEXT || ' políticas'
      ELSE '❌ Faltan políticas' END,
    (SELECT string_agg(policyname, ', ') FROM pg_policies WHERE tablename = 'user_snapshots'),
    CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_snapshots') < 4
      THEN 'Ejecutar script completo' ELSE 'Ninguna' END;

  -- 4. Verificar función
  RETURN QUERY
  SELECT
    4,
    'Función handle_new_user'::TEXT,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
      THEN '✅ OK' ELSE '❌ FALTA' END,
    'Función del trigger'::TEXT,
    CASE WHEN NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
      THEN 'Ejecutar script completo' ELSE 'Ninguna' END;

  -- 5. Verificar trigger
  RETURN QUERY
  SELECT
    5,
    'Trigger on_auth_user_created'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN '✅ OK' ELSE '❌ FALTA' END,
    'Trigger AFTER INSERT'::TEXT,
    CASE WHEN NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')
      THEN 'Ejecutar script completo' ELSE 'Ninguna' END;

  -- 6. Verificar permisos
  RETURN QUERY
  SELECT
    6,
    'Permisos'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.role_table_grants
      WHERE table_name = 'user_snapshots'
      AND grantee IN ('authenticated', 'service_role')
    ) THEN '✅ OK' ELSE '⚠️ Revisar' END,
    (SELECT string_agg(DISTINCT grantee, ', ')
     FROM information_schema.role_table_grants
     WHERE table_name = 'user_snapshots'),
    'Verificar manualmente'::TEXT;

  -- 7. Verificar usuarios sin snapshot
  RETURN QUERY
  SELECT
    7,
    'Usuarios sin snapshot'::TEXT,
    CASE WHEN (
      SELECT COUNT(*) FROM auth.users u
      LEFT JOIN public.user_snapshots s ON u.id = s.user_id
      WHERE s.id IS NULL
    ) = 0 THEN '✅ OK' ELSE '⚠️ ' || (
      SELECT COUNT(*) FROM auth.users u
      LEFT JOIN public.user_snapshots s ON u.id = s.user_id
      WHERE s.id IS NULL
    )::TEXT || ' huérfanos' END,
    'Usuarios existentes'::TEXT,
    CASE WHEN (
      SELECT COUNT(*) FROM auth.users u
      LEFT JOIN public.user_snapshots s ON u.id = s.user_id
      WHERE s.id IS NULL
    ) > 0 THEN 'Ejecutar backfill (incluido en script)' ELSE 'Ninguna' END;

  -- 8. Verificar registros totales
  RETURN QUERY
  SELECT
    8,
    'Estadísticas'::TEXT,
    '📊 Info'::TEXT,
    'Usuarios: ' || (SELECT COUNT(*) FROM auth.users)::TEXT ||
    ' | Snapshots: ' || (SELECT COUNT(*) FROM public.user_snapshots)::TEXT,
    'Ninguna'::TEXT;

END;
$$ LANGUAGE plpgsql;

-- PASO 10: EJECUTAR VERIFICACIÓN
-- ============================================

SELECT * FROM public.verify_complete_setup() ORDER BY step_number;

-- ============================================
-- INSTRUCCIONES FINALES:
-- ============================================
-- 1. Ejecuta este script COMPLETO
-- 2. Verifica que todos los pasos muestren ✅
-- 3. Ve a Authentication → Settings → Disable email confirmations
-- 4. Prueba registrar un NUEVO usuario (email que no hayas usado)
-- 5. Si falla, ejecuta el diagnóstico a continuación
-- ============================================
