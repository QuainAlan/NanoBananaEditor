# Architecture

Nano Banana Editor is a static React app talking to one Supabase edge function. Nothing else runs on a server.

```
Browser (React + Zustand + Konva)
   │
   │  POST /functions/v1/nano-image   { mode, model, prompt, images[], size, aspectRatio, ... }
   │  Authorization: Bearer <user session>
   │  x-gemini-key: <optional, user's own key>
   ▼
Supabase Edge Function  nano-image
   ├─ verify the user session, require a confirmed email
   ├─ validate model, size, ratio and image count against models.ts
   ├─ reserve credits   (rpc deduct_user_credits, service role)   ── skipped when x-gemini-key is present
   ├─ call Gemini       (@google/genai generateContent)
   ├─ refund on error or empty result
   ├─ insert usage_log row
   └─ return { images[], text, credits, balance, usage, grounding }
```

## Frontend

| Area | Where | Notes |
| --- | --- | --- |
| Model catalog | `src/lib/models.ts` | Capabilities, sizes, ratios, credit costs. Mirrored into the edge function. |
| App state | `src/store/useAppStore.ts` | Mode, prompt, references, settings, canvas, brush strokes, history. Persisted to IndexedDB through `idb-keyval`. |
| Theme | `src/store/useThemeStore.ts` | Light, dark or system. Applied as a `dark` class on `<html>`; `index.html` applies it before first paint. |
| Own key | `src/store/useSettingsStore.ts` | Stored in `localStorage` only. |
| Generation | `src/hooks/useGenerate.ts` | Builds the request, fires 1, 2 or 4 variants in parallel, records history items, updates the balance. |
| Masks | `src/services/maskService.ts` | Turns brush strokes into a black-and-white mask and a purple-tinted preview. Both go to the model. |
| API client | `src/services/imageApi.ts` | Thin fetch wrapper. Maps 402 to an "insufficient credits" error. |
| Canvas | `src/components/Canvas.tsx` | Konva stage: zoom, pan, brush and eraser on a separate layer, compare slider, download menu. |
| Composer | `src/components/Composer.tsx` | Mode tabs, prompt, references (drop, paste, upload), model picker, output settings, advanced controls. |
| History | `src/components/HistoryPanel.tsx` | Grid of results with details, inputs, grounding sources and request metadata. |

Design tokens are CSS variables in `src/index.css`, exposed to Tailwind as `bg`, `surface`, `line`, `ink`, `muted`, `accent` and friends in `tailwind.config.js`. Components never use raw colour classes.

## Multi-turn editing

When "Remember the thread" is on, an edit request includes the previous turns of the chain the current image came from: the earlier prompts as user turns and the earlier outputs as model turns, capped at two prior turns. The current image is still sent as the source. The model sees the conversation and follow-ups like "now make it warmer" resolve correctly.

## Masked edits

Gemini has no inpainting endpoint, so a masked edit sends three images: the source, the source with a translucent purple overlay on the painted region, and a black-and-white mask. The prompt tells the model to change only the marked region. The purple preview is what makes it reliable; the mask alone was not enough.

## Credits

Credits are integers in `user_credits.credits_balance`. Only the service role can call `deduct_user_credits` and `add_user_credits`; users can read their own balance and nothing else. The edge function charges before calling Gemini and refunds if anything goes wrong, so a failed render never costs anything.

Costs per model and size live in `models.ts`. The client shows them; the server enforces them. If the two copies ever disagreed the server would win, which is why `npm run sync:models` exists.

## Data stored

| Where | What | Lifetime |
| --- | --- | --- |
| Browser IndexedDB | Generated images, prompts, settings | Until the user clears history |
| Browser localStorage | Theme, download format, own API key | Until cleared |
| Postgres `user_credits` | Balance per user | Permanent |
| Postgres `usage_log` | Model, size, credits, tokens, duration per render. No prompts, no images | Permanent |
| Postgres `stripe_*` | Customers, orders, subscriptions | Permanent |

Images never touch the server disk. They travel through the edge function as base64 and land in the user's browser.

## Adding a model

1. Add an entry to `MODELS` in `src/lib/models.ts` with its id, sizes, ratios, input limit, capabilities and credit costs.
2. Add it to `MODEL_LIST` in the order you want it shown.
3. `npm run sync:models`, then deploy `nano-image`.

The picker, cost badges, size buttons, ratio chips and server validation all read from that one entry.
