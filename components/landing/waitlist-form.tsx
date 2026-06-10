"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/neon-button";

interface WaitlistFormProps {
  compact?: boolean;
}

export function WaitlistForm({ compact = false }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log("Polyshield waitlist signup:", { email });
    setSubmitted(true);
    setEmail("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className={compact ? "flex w-full gap-2 sm:w-auto" : "flex w-full max-w-md flex-col gap-3 sm:flex-row"}
    >
      <label className="sr-only" htmlFor={compact ? "waitlist-compact" : "waitlist-email"}>
        Email address
      </label>
      <input
        id={compact ? "waitlist-compact" : "waitlist-email"}
        type="email"
        required
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setSubmitted(false);
        }}
        placeholder="you@company.com"
        className="min-h-11 flex-1 rounded-lg border border-[#211327]/15 bg-white/80 px-3.5 text-sm text-[#211327] outline-none transition focus:border-[#6D35D4] focus:ring-4 focus:ring-[#6D35D4]/10"
      />
      <Button
        type="submit"
        variant="solid"
        neon={false}
        className="mx-0 min-h-11 rounded-lg border-[#6D35D4] bg-[#6D35D4] px-4 py-2 text-sm font-medium text-white hover:border-[#211327]/20 hover:bg-[#5B2AB6]"
      >
        <span className="flex items-center justify-center gap-2">
          Join waitlist
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </Button>
      {submitted ? (
        <p className="self-center text-sm text-[#6B7280]" role="status">
          Logged locally for now.
        </p>
      ) : null}
    </form>
  );
}
