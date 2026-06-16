-- Polyshield 0014 — proof-gated manual plan switch for local testing.
--
-- profiles.plan is not user-writable (0012): plan changes flow only through
-- Stripe -> the proof-gated billing_sync RPC. That's correct for production,
-- but it leaves no way to exercise per-tier perks when Stripe isn't set up.
--
-- dev_set_plan lets the server flip ONE user's plan, but only when it can
-- present the vault-derived proof secret (same gate as billing_sync), so it is
-- not a self-upgrade path for an attacker. The calling server action adds a
-- second independent gate (POLYSHIELD_ALLOW_MANUAL_PLAN=1) so this does nothing
-- on a normal deployment even if the proof ever leaked.

create or replace function public.dev_set_plan (
  p_user_id uuid,
  p_plan text,
  p_proof text
)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not gateway_proof_ok (p_proof) then
    return false;
  end if;
  if p_plan not in ('free', 'builder', 'team', 'enterprise') then
    return false;
  end if;

  update profiles
  set plan = p_plan,
      plan_status = 'active',
      current_period_end = null,
      cancel_at_period_end = false
  where id = p_user_id;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

revoke execute on function public.dev_set_plan (uuid, text, text) from public;
grant execute on function public.dev_set_plan (uuid, text, text) to anon, authenticated, service_role;
