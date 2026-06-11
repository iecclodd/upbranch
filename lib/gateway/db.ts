import { createClient } from "@supabase/supabase-js";

/**
 * Bare anon-key client for the gateway route. The gateway holds no privileged
 * Supabase key on purpose: every privileged read/write happens inside the
 * agent-key-gated security-definer RPCs created in
 * supabase/migrations/0002_gateway.sql, so a leaked gateway environment grants
 * nothing beyond what a valid agent key already could.
 */
export function gatewayClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
