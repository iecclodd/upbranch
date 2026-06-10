"use client";

import { FormEvent, useId, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaitlistFormProps {
  tone?: "light" | "dark";
  className?: string;
}

export function WaitlistForm({ tone = "light", className }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputId = useId();
  const dark = tone === "dark";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log("Polyshield waitlist signup:", { email });
    setSubmitted(true);
    setEmail("");
  }

  return (
    <div className={cn("w-full max-w-md", className)}>
      <form
        onSubmit={onSubmit}
        className={cn(
          "flex items-center gap-2 rounded-full p-1.5 pl-5 transition",
          dark
            ? "border border-white/15 bg-white/10 backdrop-blur focus-within:border-white/30"
            : "border border-ink/10 bg-white/85 shadow-chip backdrop-blur focus-within:border-violet/40 focus-within:ring-4 focus-within:ring-violet/10",
        )}
      >
        <label className="sr-only" htmlFor={inputId}>
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setSubmitted(false);
          }}
          placeholder="you@company.com"
          className={cn(
            "h-10 w-full min-w-0 flex-1 bg-transparent text-sm outline-none",
            dark
              ? "text-white placeholder:text-white/50"
              : "text-foreground placeholder:text-muted-foreground",
          )}
        />
        <button
          type="submit"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-violet px-5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:bg-violet-deep"
        >
          {submitted ? (
            <>
              You&apos;re in
              <Check className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              Join waitlist
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
      {submitted ? (
        <p
          role="status"
          className={cn(
            "mt-3 text-center text-sm",
            dark ? "text-white/70" : "text-muted-foreground",
          )}
        >
          Thanks — we&apos;ll reach out when your spot opens up.
        </p>
      ) : null}
    </div>
  );
}
