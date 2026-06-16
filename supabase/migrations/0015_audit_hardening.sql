-- Polyshield 0015 — hardening from the security audit.
--
-- 1) Pin search_path on the two oldest SECURITY DEFINER functions (0001). Every
--    other definer function in the migration set pins `search_path = public`;
--    owns_project (the RLS predicate behind all tenant isolation) and
--    handle_new_user were the only two that didn't. Both bodies already
--    reference only fully-qualified objects, so pinning is pure hardening that
--    closes any future operator/symbol-shadowing path.
alter function public.owns_project (uuid) set search_path = public;
alter function public.handle_new_user () set search_path = public;

-- 2) Drop the now-unused, proof-less gateway_slack_webhook. After the
--    multi-channel refactor the gateway reads channels via the proof-gated
--    gateway_notify_channels (0013) instead, so this RPC has no caller and only
--    left an agent-reachable (proof-less) read of the slack webhook ciphertext.
drop function if exists public.gateway_slack_webhook (text);
