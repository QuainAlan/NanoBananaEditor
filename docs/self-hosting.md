# Self-hosting Nano Banana Editor

This guide takes a fresh clone to a working editor with your own Supabase project and Gemini key. Budget about 30 minutes.

## What you need

| Thing | Why |
| --- | --- |
| Node 18 or newer | Builds the frontend |
| A Supabase project (free tier works) | Auth, the credits table, and the edge function that talks to Gemini |
| Supabase CLI | Applies migrations and deploys functions. `npm i -g supabase` |
| A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) | The house key the edge function uses for everyone who pays with credits |
| A Stripe account (optional) | Only if you sell credit packs. Skip it and let people bring their own key |

## 1. Clone and install

```bash
git clone https://github.com/markfulton/NanoBananaEditor.git
cd NanoBananaEditor
npm install
cp .env.example .env
```

Open `.env` and set:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Both values are in Supabase under Project Settings → API. They are public by design and ship in the browser bundle.

## 2. Database

Link the CLI to your project and push the migrations:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

That creates, in order:

- `user_credits` with the `deduct_user_credits` and `add_user_credits` functions
- the Stripe tables and views
- `usage_log`, the hardening that keeps credit functions server-only, and the signup trigger that grants 5 credits to every new account

If you would rather not give away starter credits, drop the trigger after pushing:

```sql
drop trigger if exists on_auth_user_created_grant_credits on auth.users;
```

## 3. Secrets and edge functions

Set the Gemini key as a function secret. It never goes in `.env`:

```bash
supabase secrets set GEMINI_API_KEY=AIza...
```

Deploy the image endpoint:

```bash
supabase functions deploy nano-image
```

`nano-image` checks the caller's session, reserves credits, calls Gemini, refunds on failure and writes a row to `usage_log`. It reads `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, which Supabase injects automatically.

### Selling credits with Stripe (optional)

1. Create a one-time Price in Stripe for your credit pack and put its id and credit count in `src/stripe-config.ts`.
2. Set the secrets and deploy both functions:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
supabase functions deploy stripe-checkout
supabase functions deploy stripe-webhook --no-verify-jwt
```

3. In Stripe, point a webhook at `https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook` for `checkout.session.completed`.

The two legacy functions, `generate-image` and `edit-image`, exist for older frontend builds. A fresh install does not need them.

## 4. Auth settings worth changing

In the Supabase dashboard under Authentication:

- **Email confirmation** stays on. The edge function refuses unconfirmed accounts.
- **Custom SMTP.** The built-in mailer sends a handful of messages an hour. Connect a provider such as Resend before you invite anyone.
- **Site URL and redirect URLs.** Add your domain so confirmation and password-reset links land on your app.
- **Rate limits.** Raise the email rate limit if you expect a burst of signups.

## 5. Run

```bash
npm run dev
```

Open `http://localhost:5173`, sign up, confirm the email, and generate with the 5 starter credits. Or open Settings and paste your own Gemini key to skip credits entirely.

## 6. Deploy the frontend

`npm run build` produces a static site in `dist/`. Any static host works: Bolt, Vercel, Netlify, Cloudflare Pages. Set the two `VITE_` variables in the host's environment settings, and make sure unknown routes fall back to `index.html`.

## Changing prices

Everything about models and credit costs lives in one file, `src/lib/models.ts`. After editing it run:

```bash
npm run sync:models
```

That copies the file into the edge function so the server and the browser always agree. Deploy `nano-image` again afterwards.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| "Sign in to generate images" with a valid session | The request reached the function without a user token. Check `VITE_SUPABASE_ANON_KEY`. |
| "Not enough credits" on a fresh account | The signup trigger is missing. Re-run `supabase db push`. |
| "The Gemini API key was rejected" | `GEMINI_API_KEY` is unset or wrong. `supabase secrets list` to confirm it exists. |
| "Image size 2K is not supported for this model" | Nano Banana 2 Lite only renders 1K. Pick another model or size. |
| Renders work but credits never change | You are using your own key from Settings. That path is free by design. |
