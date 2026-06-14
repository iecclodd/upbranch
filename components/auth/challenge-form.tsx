"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Only honor a same-origin relative path (mirror of the server-side guard). */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/dashboard";
  }
  return raw;
}

/**
 * Second-factor gate. Reached only when middleware sees a session at aal1 while
 * the user has a verified TOTP factor (nextLevel aal2). challengeAndVerify
 * upgrades THIS session to aal2 on success, after which middleware lets the
 * dashboard through.
 */
export function ChallengeForm() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setError(error.message);
        setReady(true);
        return;
      }
      const totp = data?.totp?.find((f) => f.status === "verified") ?? data?.totp?.[0];
      if (!totp) {
        // No factor to challenge — nothing to enforce, send them on.
        router.replace(next);
        return;
      }
      setFactorId(totp.id);
      setReady(true);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setLoading(false);
    if (error) {
      setError(error.message);
      setCode("");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function cancel() {
    await supabase.auth.signOut();
    router.replace("/signin");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet/10 text-violet">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
        Two-factor authentication
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the 6-digit code from your authenticator app to finish signing in.
      </p>

      <form onSubmit={verify} className="mt-7 space-y-4">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          disabled={!ready || loading}
          className="w-full rounded-xl border border-ink/10 bg-white px-3.5 py-3 text-center text-2xl font-semibold tracking-[0.4em] outline-none transition focus:border-violet/40 focus:ring-4 focus:ring-violet/10 disabled:opacity-60"
        />

        {error ? (
          <p className="text-sm text-[#B3266C]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-70"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Verify
        </button>
      </form>

      <button
        type="button"
        onClick={cancel}
        className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Sign in with a different account
      </button>
    </div>
  );
}
