-- Polyshield 0010 — Stripe subscription sync.
-- The webhook has no user session and this project has no working service-role
-- key, so plan sync goes through a proof-gated RPC (same secret the gateway
-- uses, derived from POLYSHIELD_VAULT_KEY). Only our server can call it.

alter table public.profiles
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists cancel_at_period_end boolean not null default false;

create or replace function public.billing_sync (
  p_customer_id text,
  p_subscription_id text,
  p_price_id text,
  p_plan text,
  p_status text,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean,
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
  set stripe_subscription_id = p_subscription_id,
      stripe_price_id = p_price_id,
      plan = p_plan,
      plan_status = coalesce(p_status, 'active'),
      current_period_end = p_period_end,
      cancel_at_period_end = coalesce(p_cancel_at_period_end, false)
  where stripe_customer_id = p_customer_id;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

revoke execute on function public.billing_sync (text, text, text, text, text, timestamptz, boolean, text) from public;
grant execute on function public.billing_sync (text, text, text, text, text, timestamptz, boolean, text) to anon, authenticated, service_role;
