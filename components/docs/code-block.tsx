"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Dark terminal-style code block with a copy button. Mirrors the look of
 * the dashboard connect snippet so the docs feel native to the app.
 */
export function CodeBlock({
  code,
  label = "Copy code",
}: {
  code: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-ink p-4 pr-12 font-mono text-xs leading-5 text-white/90">
        {code}
      </pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute right-2.5 top-2.5 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label={label}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
