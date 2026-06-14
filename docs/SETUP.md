# Polyshield — what you need to configure

Everything below is **external config you provide**; the code is built and the DB migrations (through `0011`) are already applied to your Supabase project. Add these to your hosting env (and `.env.local` for local dev). Features degrade gracefully when a key is missing (e.g. AI shows "not configured", billing shows "not configured") — nothing crashes.

## 1. Stripe (premium plans)

**Env vars**
```bash
STRIPE_SECRET_KEY=sk_live_...            # Stripe → Developers → API keys → Secret key
STRIPE_WEBHOOK_SECRET=whsec_...          # from the webhook endpoint you create (below)
STRIPE_PRICE_BUILDER=price_...           # the Price ID of your Builder recurring price
STRIPE_PRICE_TEAM=price_...              # the Price ID of your Team recurring price
NEXT_PUBLIC_SITE_URL=https://your-app    # used for checkout success/return URLs
```

**Dashboard steps**
1. **Products → add a product** for *Builder* and *Team*, each with a recurring monthly Price. Copy each **Price ID** (`price_…`, not `prod_…`) into the env vars above. (Prices: I set the UI labels to $20/mo and $80/mo — set the real Stripe prices to match or edit `lib/billing/plans.ts`.)
2. **Developers → Webhooks → Add endpoint** → URL `https://your-app/api/stripe/webhook` → subscribe to: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy its **Signing secret** → `STRIPE_WEBHOOK_SECRET`.
3. **Settings → Billing → Customer portal** → configure once and **Save** (required in live mode before the "Manage billing" button works).
4. Test vs live have separate keys/prices/webhooks — keep them straight.

> Note: the webhook writes the plan via a proof-gated DB function (no service-role key needed). It uses your existing `POLYSHIELD_VAULT_KEY` — make sure that's set in the same env, and that you've run `node scripts/set-gateway-proof.mjs` once for this environment (you already did).

## 2. Groq (AI features — free)

```bash
GROQ_API_KEY=gsk_...        # https://console.groq.com/keys
AI_PROVIDER=groq            # optional; groq | openai | anthropic (defaults to groq)
# optional later:
# OPENAI_API_KEY=sk-...     # if AI_PROVIDER=openai
# ANTHROPIC_API_KEY=...     # if AI_PROVIDER=anthropic
# optional tuning (sane defaults baked in):
# AI_DAILY_CALL_CAP=200  AI_MAX_OUTPUT_TOKENS=400  AI_REQUEST_TIMEOUT_MS=20000
```
AI features (approval risk summary, NL→policy drafting) are **paid-plan only** and **rate-limited per project per day** (atomic Postgres cap) so a runaway loop can't run up a bill. Models: `llama-3.3-70b-versatile` (analysis) and `llama-3.1-8b-instant` (cheap). Swapping to GPT/Claude later is just `AI_PROVIDER` + the matching key.

## 3. GitHub sign-in

1. **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.** Authorization callback URL = `https://<your-project-ref>.supabase.co/auth/v1/callback` (the **Supabase** callback, not your app). Copy the **Client ID** and generate a **Client secret**.
2. **Supabase → Authentication → Providers → GitHub** → enable, paste Client ID + Secret, Save.
3. **Supabase → Authentication → URL Configuration** → add `https://your-app/auth/callback` (and `http://localhost:3000/auth/callback` for dev) to **Redirect URLs**.

The "Continue with GitHub" button is already wired; once the provider is enabled it just works.

## 4. 2FA / passkeys (Supabase Auth)

- **TOTP (authenticator app)** is GA and already wired in **Settings → Two-factor authentication** — just enable MFA under **Supabase → Authentication → Multi-Factor Authentication**.
- **Passkeys** are **beta** in Supabase (not GA). The "Add passkey (beta)" button calls the experimental API if your `supabase-js` build exposes it, and shows "not enabled yet" otherwise. Treat as experimental.

## 5. Slack approval notifications (per project, optional)

No env var — each user pastes a **Slack incoming-webhook URL** in **Settings → Connections**. It's encrypted in the vault; the gateway posts a notification (with a deep link) whenever a call is held for approval. Validated to `hooks.slack.com` on save and again before sending.

## 6. Container enforcement (runner, optional)

The sandbox's **"Run in a container"** toggle makes egress/memory limits kernel-enforced via Docker (`--network none`, `--memory`, `--cap-drop ALL`, scoped mount). Requires **Docker on the runner host**; falls back to declared (with a log line) if absent.
- `POLYSHIELD_RUNNER_IMAGE` (optional, default `node:20-alpine`) — for `--network none` to work with an `npx`-based server, bake the MCP server into a custom image (npx can't download with no network). This is the prototype caveat (PRD R12).

---

### Already set (don't change unless rotating)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `POLYSHIELD_VAULT_KEY`, `SUPABASE_DB_URL`.
