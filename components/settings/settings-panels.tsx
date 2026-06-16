"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  Bell,
  Hash,
  KeyRound,
  Loader2,
  LogOut,
  MessageSquare,
  Send,
  ShieldCheck,
  Slack,
  Sparkles,
  User,
  Webhook,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  setNotifyChannelAction,
  setPrivacyModeAction,
  signOutAction,
  signOutEverywhereAction,
  updateProfileNameAction,
} from "@/app/dashboard/actions";
import { GlassCard } from "@/components/dashboard/primitives";
import { minPlanFor, planLabel } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

// ---------- Account ----------

export function AccountPanel({
  email,
  fullName,
  avatarUrl,
}: {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}) {
  const [name, setName] = useState(fullName ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const initials = (fullName || email || "?").trim().charAt(0).toUpperCase();

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateProfileNameAction(name);
      setMsg(r.error ?? "Saved.");
    });
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-violet" aria-hidden="true" />
        <h2 className="font-semibold text-foreground">Account</h2>
      </div>

      <div className="mt-5 flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet/10 text-lg font-semibold text-violet">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{email ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Signed in with email / Google</p>
        </div>
      </div>

      <label className="mt-5 block text-sm font-medium text-foreground" htmlFor="display-name">
        Display name
      </label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <input
          id="display-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Your name"
          className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-violet/40 focus:ring-4 focus:ring-violet/10"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
      </div>
      {msg ? (
        <p className={cn("mt-2 text-sm", msg === "Saved." ? "text-emerald-700" : "text-rose-600")}>{msg}</p>
      ) : null}

      <div className="mt-6 border-t border-ink/5 pt-5">
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-ink/5"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </GlassCard>
  );
}

// ---------- Sessions ----------

export function SessionsPanel() {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-violet" aria-hidden="true" />
        <h2 className="font-semibold text-foreground">Active sessions</h2>
      </div>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        You&apos;re signed in on this browser. If you&apos;ve signed in elsewhere, or you suspect
        access you don&apos;t recognize, sign out of every session — this invalidates all other
        devices immediately.
      </p>
      <form action={signOutEverywhereAction} className="mt-4">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out of all sessions
        </button>
      </form>
    </GlassCard>
  );
}

// ---------- 2FA (TOTP) + passkey beta ----------

interface Factor {
  id: string;
  friendly_name?: string | null;
}

export function MfaPanel() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [passkeyMsg, setPasskeyMsg] = useState<string | null>(null);

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setMsg(null);
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error) return setMsg(error.message);
    setEnroll({ factorId: data.id, qr: data.totp.qr_code });
  }

  async function verify() {
    if (!enroll) return;
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enroll.factorId,
      code,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setEnroll(null);
    setCode("");
    setMsg("Two-factor authentication is on.");
    refresh();
  }

  async function remove(factorId: string) {
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    refresh();
  }

  async function addPasskey() {
    setPasskeyMsg(null);
    const auth = supabase.auth as unknown as { registerPasskey?: () => Promise<{ error?: { message: string } }> };
    if (typeof auth.registerPasskey !== "function") {
      setPasskeyMsg("Passkeys are in beta and not enabled on this deployment yet.");
      return;
    }
    try {
      const { error } = await auth.registerPasskey();
      setPasskeyMsg(error ? error.message : "Passkey registered.");
    } catch {
      setPasskeyMsg("Could not register a passkey (beta).");
    }
  }

  const hasMfa = (factors?.length ?? 0) > 0;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-violet" aria-hidden="true" />
        <h2 className="font-semibold text-foreground">Two-factor authentication</h2>
        {hasMfa ? (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            on
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Protect your account with an authenticator app (TOTP). Once enrolled, you&apos;ll be asked
        for a code at sign-in.
      </p>

      {enroll ? (
        <div className="mt-4 rounded-xl border border-ink/10 p-4">
          <p className="text-sm font-medium text-foreground">Scan with your authenticator app</p>
          {/* qr_code is a raw SVG string from Supabase; render it as an image
              data-URL rather than injecting markup (no dangerouslySetInnerHTML). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/svg+xml;utf-8,${encodeURIComponent(enroll.qr)}`}
            alt="Two-factor authentication QR code"
            width={180}
            height={180}
            className="mt-3 inline-block rounded-lg bg-white p-2"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              placeholder="6-digit code"
              className="w-40 rounded-lg border border-ink/10 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-violet/40 focus:ring-4 focus:ring-violet/10"
            />
            <button
              type="button"
              onClick={verify}
              disabled={busy || code.length < 6}
              className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & enable"}
            </button>
            <button
              type="button"
              onClick={() => setEnroll(null)}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-foreground hover:bg-ink/5"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {factors?.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-2 rounded-full bg-ink/[0.04] px-3 py-1.5 text-sm text-foreground/80"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              {f.friendly_name || "Authenticator"}
              <button
                type="button"
                onClick={() => remove(f.id)}
                className="text-xs text-rose-600 hover:underline"
              >
                remove
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={startEnroll}
            disabled={busy}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-plum disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add authenticator app"}
          </button>
          <button
            type="button"
            onClick={addPasskey}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-ink/5"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet" aria-hidden="true" />
            Add passkey (beta)
          </button>
        </div>
      )}
      {msg ? <p className="mt-3 text-sm text-emerald-700">{msg}</p> : null}
      {passkeyMsg ? <p className="mt-2 text-sm text-muted-foreground">{passkeyMsg}</p> : null}
    </GlassCard>
  );
}

// ---------- Privacy mode ----------

export function PrivacyPanel({
  initialEnabled,
  canUse,
}: {
  initialEnabled: boolean;
  canUse: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function toggle() {
    const next = !enabled;
    setErr(null);
    setEnabled(next); // optimistic
    start(async () => {
      const r = await setPrivacyModeAction(next);
      if (r.error) {
        setEnabled(!next); // revert
        setErr(r.error);
      }
    });
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-foreground">Offline / privacy mode</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            When on, tool arguments and results are stripped before anything is written to the audit
            log — only the tool name, the decision, and byte sizes are kept. Your file contents,
            diffs, and query results are never stored in our database. Policies, approvals, and the
            shield still run on the live call; only the saved record is redacted.{" "}
            <Link href="/docs#offline-mode" className="font-medium text-violet hover:underline">
              How it works
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending}
          onClick={toggle}
          className={cn(
            "relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
            enabled ? "bg-violet" : "bg-ink/15",
          )}
        >
          <span
            className={cn(
              "inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-[22px]" : "translate-x-1",
            )}
          />
        </button>
      </div>
      {!canUse ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Offline / privacy mode is a {planLabel(minPlanFor("privacy_mode"))} feature.{" "}
          <Link href="/pricing" className="font-medium text-violet hover:underline">
            Upgrade
          </Link>{" "}
          to enable it.
        </p>
      ) : null}
      {err ? <p className="mt-2 text-sm text-rose-600">{err}</p> : null}
    </GlassCard>
  );
}

// ---------- Notifications (multi-channel) ----------

export interface ChannelState {
  slack: boolean;
  discord: boolean;
  telegram: boolean;
  webhook: boolean;
}

export function NotificationsPanel({
  configured,
  canUse,
}: {
  configured: ChannelState;
  canUse: boolean;
}) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-violet" aria-hidden="true" />
        <h2 className="font-semibold text-foreground">Approval notifications</h2>
      </div>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Get pinged the moment an agent action is held for approval, so you can review it from
        wherever you are. Connect any of these — we send the tool, agent, risk, and a link, never
        your tool arguments or results.
      </p>
      {!canUse ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Notifications are a {planLabel(minPlanFor("notifications"))} feature.{" "}
          <Link href="/pricing" className="font-medium text-violet hover:underline">
            Upgrade
          </Link>{" "}
          to connect a channel.
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        <UrlChannel
          channel="slack"
          icon={<Slack className="h-4 w-4" aria-hidden="true" />}
          title="Slack"
          placeholder="https://hooks.slack.com/services/…"
          help="Create an incoming webhook in your Slack workspace and paste its URL."
          connected={configured.slack}
          disabled={!canUse}
        />
        <UrlChannel
          channel="discord"
          icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
          title="Discord"
          placeholder="https://discord.com/api/webhooks/…"
          help="Channel → Edit → Integrations → Webhooks → New Webhook → Copy URL."
          connected={configured.discord}
          disabled={!canUse}
        />
        <TelegramChannel connected={configured.telegram} disabled={!canUse} />
        <UrlChannel
          channel="webhook"
          icon={<Webhook className="h-4 w-4" aria-hidden="true" />}
          title="Custom webhook"
          placeholder="https://your-service.example.com/hooks/polyshield"
          help="We POST a JSON payload to any public https endpoint you control."
          connected={configured.webhook}
          disabled={!canUse}
        />
      </div>
    </GlassCard>
  );
}

function ChannelShell({
  icon,
  title,
  help,
  connected,
  children,
}: {
  icon: ReactNode;
  title: string;
  help: string;
  connected: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink/10 p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex rounded-md bg-ink/[0.04] p-1.5 text-foreground/70">{icon}</span>
        <span className="font-medium text-foreground">{title}</span>
        {connected ? (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            connected
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{help}</p>
      {children}
    </div>
  );
}

function UrlChannel({
  channel,
  icon,
  title,
  placeholder,
  help,
  connected,
  disabled,
}: {
  channel: "slack" | "discord" | "webhook";
  icon: ReactNode;
  title: string;
  placeholder: string;
  help: string;
  connected: boolean;
  disabled: boolean;
}) {
  const [url, setUrl] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(connected);

  function save(clear = false) {
    setMsg(null);
    start(async () => {
      const r = await setNotifyChannelAction({ channel, url: clear ? "" : url });
      if (r.error) return setMsg(r.error);
      setIsConnected(!clear);
      setUrl("");
      setMsg(clear ? "Disconnected." : "Connected.");
    });
  }

  return (
    <ChannelShell icon={icon} title={title} help={help} connected={isConnected}>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || pending}
          className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-violet/40 focus:ring-4 focus:ring-violet/10 disabled:bg-ink/[0.03]"
        />
        <button
          type="button"
          onClick={() => save(false)}
          disabled={disabled || pending || !url.trim()}
          className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
        </button>
        {isConnected ? (
          <button
            type="button"
            onClick={() => save(true)}
            disabled={pending}
            className="rounded-full border border-ink/15 px-3 py-2 text-sm font-semibold text-foreground hover:bg-ink/5"
          >
            Disconnect
          </button>
        ) : null}
      </div>
      {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}
    </ChannelShell>
  );
}

function TelegramChannel({ connected, disabled }: { connected: boolean; disabled: boolean }) {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(connected);

  function save(clear = false) {
    setMsg(null);
    start(async () => {
      const r = await setNotifyChannelAction(
        clear
          ? { channel: "telegram", botToken: "", chatId: "" }
          : { channel: "telegram", botToken, chatId },
      );
      if (r.error) return setMsg(r.error);
      setIsConnected(!clear);
      setBotToken("");
      setChatId("");
      setMsg(clear ? "Disconnected." : "Connected.");
    });
  }

  return (
    <ChannelShell
      icon={<Send className="h-4 w-4" aria-hidden="true" />}
      title="Telegram"
      help="Create a bot with @BotFather for the token, then your numeric chat id (or @channelusername)."
      connected={isConnected}
    >
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          placeholder="123456789:AA…"
          disabled={disabled || pending}
          className="min-w-0 rounded-lg border border-ink/10 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-violet/40 focus:ring-4 focus:ring-violet/10 disabled:bg-ink/[0.03]"
        />
        <div className="flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-2.5 has-[:focus]:border-violet/40 has-[:focus]:ring-4 has-[:focus]:ring-violet/10">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <input
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="chat id"
            disabled={disabled || pending}
            className="min-w-0 flex-1 bg-transparent py-2 font-mono text-xs outline-none disabled:opacity-60"
          />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => save(false)}
          disabled={disabled || pending || !botToken.trim() || !chatId.trim()}
          className="rounded-full bg-violet px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-deep disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
        </button>
        {isConnected ? (
          <button
            type="button"
            onClick={() => save(true)}
            disabled={pending}
            className="rounded-full border border-ink/15 px-3 py-2 text-sm font-semibold text-foreground hover:bg-ink/5"
          >
            Disconnect
          </button>
        ) : null}
      </div>
      {msg ? <p className="mt-2 text-xs text-muted-foreground">{msg}</p> : null}
    </ChannelShell>
  );
}
