-- ─── Tabla principal ──────────────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Nueva Tarea',
  prompt TEXT NOT NULL DEFAULT '',
  media JSONB NOT NULL DEFAULT '[{"url_post":"","url_video":"","width":null,"height":null}]',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- ─── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_updated_at ON public.tasks(updated_at DESC);
-- Índice compuesto: cubre el filtro user_id + orden updated_at en una sola pasada.
-- La query principal es: SELECT * FROM tasks WHERE user_id = $1 ORDER BY updated_at DESC
-- Sin este índice el planner usa idx_tasks_user_id y luego ordena en memoria.
CREATE INDEX idx_tasks_user_updated ON public.tasks(user_id, updated_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Permisos ──────────────────────────────────────────────────────────────────
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks REPLICA IDENTITY FULL;
