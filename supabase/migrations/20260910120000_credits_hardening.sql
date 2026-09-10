/*
  # Credits hardening + usage log (2026-09-10 refresh)

  1. Close the holes that let a signed-in user change their own balance:
     - drop the UPDATE and INSERT policies on user_credits (SELECT stays)
     - revoke EXECUTE on the credit RPCs from anon/authenticated; only the
       service role (edge functions) may call them
  2. Add usage_log so every generation is recorded with model, size and cost.
*/

DROP POLICY IF EXISTS "Users can update their own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can insert their own credits" ON user_credits;

REVOKE EXECUTE ON FUNCTION deduct_user_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION add_user_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION deduct_user_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION add_user_credits(uuid, integer) TO service_role;

CREATE TABLE IF NOT EXISTS usage_log (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL,
  model text NOT NULL,
  image_size text NOT NULL,
  aspect_ratio text,
  credits integer NOT NULL DEFAULT 0,
  byok boolean NOT NULL DEFAULT false,
  used_search boolean NOT NULL DEFAULT false,
  prompt_tokens integer,
  output_tokens integer,
  thought_tokens integer,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON usage_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_usage_log_user_created ON usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_created ON usage_log(created_at DESC);
