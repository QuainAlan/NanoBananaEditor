/*
  # Pin search_path on SECURITY DEFINER functions and lock the legacy usage RPC
*/

ALTER FUNCTION deduct_user_credits(uuid, integer) SET search_path = public;
ALTER FUNCTION add_user_credits(uuid, integer) SET search_path = public;
ALTER FUNCTION increment_user_usage(uuid) SET search_path = public;

REVOKE EXECUTE ON FUNCTION increment_user_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_user_usage(uuid) TO service_role;
