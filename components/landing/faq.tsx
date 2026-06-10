"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "Is Polyshield an AI VPN?",
    answer:
      "No. It is a tool/action gateway for AI agents. The VPN metaphor helped explain routing, but Polyshield controls tool calls, credentials, approvals, and logs.",
  },
  {
    question: "Does Polyshield use AI to judge other AI?",
    answer:
      "Mostly no. The core enforcement should be deterministic policies and human approval. AI can help flag suspicious context, but policy is the source of truth.",
  },
  {
    question: "What agents does it work with?",
    answer:
      "Start with agents using MCP/tool calls. Future support can include browser agents and local/runtime sandboxes.",
  },
  {
    question: "Does the agent see my API keys?",
    answer:
      "No. The intended design is that Polyshield stores credentials and executes approved actions on behalf of the agent.",
  },
  {
    question: "Is this production-ready?",
    answer:
      "The first version is an MVP/demo for agent builders and design partners.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.74fr_1fr]">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.025em] text-[#211327] sm:text-4xl">
            Questions teams ask before giving agents tool access.
          </h2>
        </div>
        <div className="divide-y divide-[#211327]/10 rounded-xl border border-[#211327]/10 bg-white shadow-soft">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-[#211327]"
                  aria-expanded={isOpen}
                >
                  {faq.question}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-[#6B7280] transition-transform",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
                {isOpen ? (
                  <p className="px-5 pb-5 text-sm leading-6 text-[#6B7280]">
                    {faq.answer}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
