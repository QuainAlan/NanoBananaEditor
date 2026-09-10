/*
  # 5 free credits on signup (enough for 5 Nano Banana 2 Lite images)

  Runs as a trigger on auth.users so it cannot be called from the client.
  Existing accounts are untouched.
*/

CREATE OR REPLACE FUNCTION public.grant_signup_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits_balance)
  VALUES (NEW.id, 5)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_signup_credits() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_signup_credits();
