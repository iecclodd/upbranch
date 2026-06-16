/**
 * Multi-channel approval notifications. When a call is held for approval the
 * gateway fans out to every destination a project has configured — Slack,
 * Discord, Telegram, or a generic webhook — so a human can act from wherever
 * they live. All sends are fire-and-forget with a short timeout: a slow or
 * dead notification target must never slow (or fail) the gateway's response to
 * the agent. Each channel validates its destination host before sending so a
 * tampered vault value can't turn the gateway into an SSRF deputy.
 */
import { notifySlackApproval } from "@/lib/notify/slack";
import { isPublicHttpUrl, postJsonGuarded } from "@/lib/mcp/client";

export interface ApprovalNotice {
  tool: string;
  agent: string;
  reason: string;
  risk: string;
  dashboardUrl?: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface NotifyChannels {
  slack?: string | null;
  discord?: string | null;
  telegram?: TelegramConfig | null;
  webhook?: string | null;
}

export type ChannelType = "slack" | "discord" | "telegram" | "webhook";

const TIMEOUT_MS = 4_000;

function emojiFor(risk: string): string {
  return risk === "destructive" || risk === "high"
    ? "🔴"
    : risk === "moderate"
      ? "🟠"
      : "🟡";
}

/** Discord embed accent (decimal). Red / orange / amber by risk. */
function discordColor(risk: string): number {
  return risk === "destructive" || risk === "high"
    ? 0xef4444
    : risk === "moderate"
      ? 0xf97316
      : 0xeab308;
}

function isDiscordWebhook(url: string): boolean {
  return /^https:\/\/(canary\.|ptb\.)?(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+/.test(url);
}

/** Telegram bot token shape: "<digits>:<base64url-ish>". */
export function isTelegramBotToken(token: string): boolean {
  return /^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(token);
}

/** Telegram chat id: numeric (incl. negative group ids) or @channelusername. */
export function isTelegramChatId(id: string): boolean {
  return /^-?\d{1,20}$/.test(id) || /^@[A-Za-z0-9_]{4,}$/.test(id);
}

// Fixed-host channels (Discord/Telegram) — host is pinned by regex, so fetch is
// fine, but we still refuse redirects so a compromised reply can't bounce us.
async function post(url: string, body: unknown): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "manual",
    });
  } catch {
    // best effort — never block or fail the gateway on a notification
  }
}

export async function notifyDiscordApproval(webhookUrl: string, n: ApprovalNotice): Promise<void> {
  if (!isDiscordWebhook(webhookUrl)) return;
  const fields = [
    { name: "Agent", value: n.agent.slice(0, 256) || "—", inline: true },
    { name: "Risk", value: n.risk || "—", inline: true },
  ];
  if (n.reason) fields.push({ name: "Reason", value: n.reason.slice(0, 1000), inline: false });
  await post(webhookUrl, {
    username: "Polyshield",
    embeds: [
      {
        title: `${emojiFor(n.risk)} Approval needed — ${n.tool}`.slice(0, 256),
        url: n.dashboardUrl,
        color: discordColor(n.risk),
        fields,
        footer: { text: "Review and approve or deny in Polyshield." },
      },
    ],
  });
}

export async function notifyTelegramApproval(cfg: TelegramConfig, n: ApprovalNotice): Promise<void> {
  if (!isTelegramBotToken(cfg.botToken) || !isTelegramChatId(cfg.chatId)) return;
  // Plain text (no Markdown) so tool names / reasons with special chars can't
  // break Telegram's parser or be misread as formatting.
  const lines = [
    `${emojiFor(n.risk)} Polyshield approval needed`,
    `Tool: ${n.tool}`,
    `Agent: ${n.agent}`,
    `Risk: ${n.risk}`,
  ];
  if (n.reason) lines.push(`Reason: ${n.reason.slice(0, 600)}`);
  if (n.dashboardUrl) lines.push(n.dashboardUrl);
  await post(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
    chat_id: cfg.chatId,
    text: lines.join("\n").slice(0, 3500),
    disable_web_page_preview: true,
  });
}

export async function notifyWebhookApproval(url: string, n: ApprovalNotice): Promise<void> {
  // Up-front gate rejects literal private IPs (incl. IPv4-mapped IPv6) and
  // non-https; postJsonGuarded then pins the connection to a re-validated public
  // IP at connect time (defeats DNS rebinding) and never follows redirects.
  if (!(await isPublicHttpUrl(url))) return;
  await postJsonGuarded(url, {
    type: "approval_required",
    source: "polyshield",
    tool: n.tool,
    agent: n.agent,
    risk: n.risk,
    reason: n.reason || null,
    dashboard_url: n.dashboardUrl ?? null,
  });
}

/** Fan out one approval notice to every configured channel, concurrently. */
export async function notifyApprovalChannels(ch: NotifyChannels, n: ApprovalNotice): Promise<void> {
  const tasks: Array<Promise<void>> = [];
  if (ch.slack) tasks.push(notifySlackApproval(ch.slack, n));
  if (ch.discord) tasks.push(notifyDiscordApproval(ch.discord, n));
  if (ch.telegram?.botToken && ch.telegram?.chatId) tasks.push(notifyTelegramApproval(ch.telegram, n));
  if (ch.webhook) tasks.push(notifyWebhookApproval(ch.webhook, n));
  await Promise.allSettled(tasks);
}
