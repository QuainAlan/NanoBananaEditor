// Shared helper for the two legacy endpoints (generate-image, edit-image).
// They exist only so an older frontend build keeps working, and now charge
// credits server-side like nano-image does. Delete once every client is on v2.
import { createClient } from 'npm:@supabase/supabase-js@2.56.1';

export const LEGACY_MODEL = 'gemini-3-pro-image';
export const LEGACY_CREDITS = 3;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

export async function chargeUser(req: Request): Promise<{ ok: true; refund: () => Promise<void> } | { ok: false; response: Response }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return { ok: false, response: json({ error: 'Sign in to generate images.' }, 401) };

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await userClient.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return { ok: false, response: json({ error: 'Your session has expired. Sign in again.' }, 401) };

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: charged, error: deductError } = await admin.rpc('deduct_user_credits', { user_uuid: user.id, credits_to_deduct: LEGACY_CREDITS });
  if (deductError) return { ok: false, response: json({ error: 'Could not reserve credits. Try again.' }, 500) };
  if (!charged) return { ok: false, response: json({ error: 'Not enough credits. Purchase more to continue.' }, 402) };

  return {
    ok: true,
    refund: async () => {
      await admin.rpc('add_user_credits', { user_uuid: user.id, credits_to_add: LEGACY_CREDITS });
    },
  };
}
