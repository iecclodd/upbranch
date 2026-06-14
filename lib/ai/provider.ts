/**
 * AI provider abstraction. Polyshield ships on Groq (free, fast, OpenAI-
 * compatible) but the door stays open for OpenAI/Anthropic via AI_PROVIDER —
 * swapping is a config change, not a code change. Dependency-free fetch.
 */

export interface CompleteOpts {
  system: string;
  user: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Ask the model for a JSON object response (OpenAI-compatible). */
  json?: boolean;
}

export interface CompleteResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface AiProvider {
  complete(opts: CompleteOpts): Promise<CompleteResult>;
}

/** Recommended Groq models (2026). Workhorse + cheapest. */
export const GROQ_MODELS = {
  smart: "llama-3.3-70b-versatile",
  cheap: "llama-3.1-8b-instant",
} as const;

class RateLimitError extends Error {
  status = 429 as const;
  retryAfterSec?: number;
}

/** OpenAI-compatible chat completion over fetch (Groq + OpenAI share this). */
async function openAiCompatibleComplete(
  baseUrl: string,
  apiKey: string,
  defaultModel: string,
  opts: CompleteOpts,
): Promise<CompleteResult> {
  const model = opts.model ?? defaultModel;
  const timeoutMs = opts.timeoutMs ?? Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 20_000);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      temperature: opts.temperature ?? 0.2,
      max_completion_tokens: opts.maxOutputTokens ?? 400,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (res.status === 429) {
    const e = new RateLimitError("Rate limited by the AI provider.");
    const ra = Number(res.headers.get("retry-after"));
    if (Number.isFinite(ra)) e.retryAfterSec = ra;
    throw e;
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI provider error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    model?: string;
  };
  return {
    text: json.choices?.[0]?.message?.content ?? "",
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    model: json.model ?? model,
  };
}

class GroqProvider implements AiProvider {
  complete(opts: CompleteOpts) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
    return openAiCompatibleComplete(
      "https://api.groq.com/openai/v1",
      apiKey,
      GROQ_MODELS.smart,
      opts,
    );
  }
}

class OpenAiProvider implements AiProvider {
  complete(opts: CompleteOpts) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
    return openAiCompatibleComplete("https://api.openai.com/v1", apiKey, "gpt-4o-mini", opts);
  }
}

class AnthropicProvider implements AiProvider {
  async complete(opts: CompleteOpts): Promise<CompleteResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
    const model = opts.model ?? "claude-haiku-4-5";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
        max_tokens: opts.maxOutputTokens ?? 400,
        temperature: opts.temperature ?? 0.2,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = (await res.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
      model?: string;
    };
    return {
      text: j.content?.[0]?.text ?? "",
      inputTokens: j.usage?.input_tokens ?? 0,
      outputTokens: j.usage?.output_tokens ?? 0,
      model: j.model ?? model,
    };
  }
}

export function getProvider(): AiProvider {
  switch (process.env.AI_PROVIDER) {
    case "openai":
      return new OpenAiProvider();
    case "anthropic":
      return new AnthropicProvider();
    default:
      return new GroqProvider();
  }
}

export function isRateLimit(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && "status" in e && (e as { status?: number }).status === 429);
}
