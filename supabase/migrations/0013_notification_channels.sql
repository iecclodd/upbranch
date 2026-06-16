-- Polyshield 0013 — multi-channel approval notifications.
--
-- Generalizes the single Slack webhook into per-project Discord, Telegram, and
-- generic-webhook destinations. Each value is AES-256-GCM ciphertext in the
-- same shape as slack_webhook_ciphertext (the gateway decrypts it with the
-- vault key, which never lives in the database). Telegram stores an encrypted
-- JSON object {botToken, chatId}. Columns are additive and nullable, so this
-- migration is safe to apply on a live DB with no backfill.

alter table public.projects
  add column if not exists discord_webhook_ciphertext text,
  add column if not exists telegram_ciphertext text,
  add column if not exists webhook_ciphertext text;

-- One read for the gateway: given an agent key hash, return every configured
-- channel's ciphertext for the project that owns the key. PROOF-GATED — like
-- gateway_call_context (0012), this returns null unless the caller presents the
-- vault-derived proof secret, so an agent-key holder can't read the channel
-- ciphertext directly via PostgREST. Returns ciphertext only (never plaintext);
-- the gateway decrypts what it needs and fans out.
create or replace function public.gateway_notify_channels (p_key_hash text, p_proof text)
returns jsonb
language sql security definer stable
set search_path = public
as $$
  select case when gateway_proof_ok (p_proof) then jsonb_build_object(
    'slack', p.slack_webhook_ciphertext,
    'discord', p.discord_webhook_ciphertext,
    'telegram', p.telegram_ciphertext,
    'webhook', p.webhook_ciphertext
  ) end
  from projects p
  join agents a on a.project_id = p.id
  where a.key_hash = p_key_hash;
$$;

revoke execute on function public.gateway_notify_channels (text, text) from public;
grant execute on function public.gateway_notify_channels (text, text) to anon, authenticated, service_role;
