/**
 * Slack approval notifications. The gateway posts to a project's incoming
 * webhook when a call is held for approval, so a human can act from their
 * phone in seconds (the durable-job design means the agent keeps waiting).
 * Fire-and-forget with a short timeout — Slack being slow must never slow the
 * gateway's response to the agent.
 */
export async function notifySlackApproval(
  webhookUrl: string,
  approval: { tool: string; agent: string; reason: string; risk: string; dashboardUrl?: string },
): Promise<void> {
  // Defense in depth: only ever POST to a real Slack webhook host, even if a
  // tampered vault value somehow reached here (no SSRF to arbitrary URLs).
  if (!/^https:\/\/hooks\.slack\.com\/services\//.test(webhookUrl)) return;
  const riskEmoji =
    approval.risk === "destructive" || approval.risk === "high" ? "🔴" : approval.risk === "moderate" ? "🟠" : "🟡";
  const text = `${riskEmoji} *Polyshield approval needed* — \`${approval.tool}\``;
  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text } },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Agent:*\n${approval.agent}` },
        { type: "mrkdwn", text: `*Risk:*\n${approval.risk}` },
      ],
    },
  ];
  if (approval.reason) {
    blocks.push({ type: "section", text: { type: "mrkdwn", text: `*Reason:*\n${approval.reason.slice(0, 300)}` } });
  }
  if (approval.dashboardUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Review in Polyshield" },
          url: approval.dashboardUrl,
        },
      ],
    });
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, blocks }),
      signal: AbortSignal.timeout(4_000),
      redirect: "manual",
    });
  } catch {
    // best effort — never block or fail the gateway on a notification
  }
}
