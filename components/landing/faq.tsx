"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Is Polyshield an AI VPN?",
    answer:
      "No. It is a tool and action gateway for AI agents. Polyshield controls tool calls, credentials, approvals, and logs — it doesn't route your network traffic.",
  },
  {
    question: "Does Polyshield use AI to judge other AI?",
    answer:
      "Mostly no. Core enforcement is deterministic policies plus human approval. AI can help flag suspicious context, but policy is the source of truth.",
  },
  {
    question: "What agents does it work with?",
    answer:
      "Anything that speaks MCP or makes tool calls works today — coding agents, support agents, internal automations. Browser agents and runtime sandboxes are on the roadmap.",
  },
  {
    question: "Does the agent see my API keys?",
    answer:
      "No. Polyshield stores credentials in its vault and executes approved actions on the agent's behalf. Tokens never enter the prompt.",
  },
  {
    question: "Is this production-ready?",
    answer:
      "We're onboarding design partners now. The first version is built with and for agent builders who need guardrails from day one.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="scroll-mt-24 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-balance text-center text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
          Questions teams ask{" "}
          <span className="font-serif italic text-violet">before</span> giving
          agents access.
        </h2>
        <div className="mt-12 divide-y divide-ink/5 rounded-2xl bg-white shadow-chip ring-1 ring-ink/5">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base font-semibold text-foreground"
                  aria-expanded={isOpen}
                >
                  {faq.question}
                  <Plus
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-45",
                    )}
                    aria-hidden="true"
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-200",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-[15px] leading-7 text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
