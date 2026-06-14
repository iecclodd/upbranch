-- Polyshield 0011 — let the gateway read a project's Slack webhook ciphertext
-- (by agent key hash) so it can notify the channel when a call is held for
-- approval. The value is AES-256-GCM ciphertext; the gateway decrypts it.

create or replace function public.gateway_slack_webhook (p_key_hash text)
returns text
language sql security definer stable
set search_path = public
as $$
  select p.slack_webhook_ciphertext
  from projects p
  join agents a on a.project_id = p.id
  where a.key_hash = p_key_hash;
$$;

revoke execute on function public.gateway_slack_webhook (text) from public;
grant execute on function public.gateway_slack_webhook (text) to anon, authenticated, service_role;
