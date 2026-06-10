"use client";

import { Archive, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Card, CardSwap } from "@/components/ui/card-swap";

const cardBase =
  "border border-white/10 bg-[#1D1226] p-6 text-white shadow-panel";

export function FeatureCardStack() {
  return (
    <CardSwap
      width={460}
      height={340}
      cardDistance={55}
      verticalDistance={64}
      delay={4500}
      skewAmount={5}
      easing="elastic"
      pauseOnHover
    >
      <Card customClass={cardBase}>
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
          <ShieldCheck className="h-4 w-4 text-lavender" aria-hidden="true" />
          <span className="text-sm font-semibold">Policy Engine</span>
        </div>
        <pre className="mt-5 overflow-hidden rounded-xl bg-black/30 p-4 font-mono text-xs leading-6 text-white/85">
          {`policy "protect-main" {
  match  = "github.merge_pull_request"
  branch = "main"

  action = require_approval("eng-leads")
}`}
        </pre>
        <p className="mt-4 text-xs text-white/50">
          Deterministic rules. No vibes-based enforcement.
        </p>
      </Card>

      <Card customClass={cardBase}>
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
          <UserRoundCheck className="h-4 w-4 text-lavender" aria-hidden="true" />
          <span className="text-sm font-semibold">Human Approval</span>
        </div>
        <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-xs text-white/50">Agent wants to run</p>
          <p className="mt-1.5 font-mono text-sm text-white/95">
            github.delete_repository
          </p>
          <p className="mt-1 font-mono text-xs text-white/55">
            &quot;acme/legacy-api&quot; · requested by deploy-bot
          </p>
          <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80">
              Deny
            </span>
            <span className="rounded-full bg-violet px-4 py-1.5 text-xs font-semibold text-white">
              Approve
            </span>
          </div>
        </div>
        <p className="mt-4 text-xs text-white/50">
          Risky calls wait. Everything else keeps moving.
        </p>
      </Card>

      <Card customClass={cardBase}>
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
          <Archive className="h-4 w-4 text-lavender" aria-hidden="true" />
          <span className="text-sm font-semibold">Audit Log</span>
        </div>
        <div className="mt-5 space-y-2 font-mono text-xs leading-5">
          <p className="text-emerald-300/90">
            14:02:11 ALLOW github.list_issues
          </p>
          <p className="text-emerald-300/90">
            14:02:14 ALLOW github.create_pull_request
          </p>
          <p className="text-lavender">
            14:02:31 ESCALATE github.merge_pull_request → @mara
          </p>
          <p className="text-[#FF9DC6]">
            14:02:58 BLOCK github.delete_repository
          </p>
        </div>
        <p className="mt-5 text-xs text-white/50">
          Every request, decision, and approver — on the record.
        </p>
      </Card>
    </CardSwap>
  );
}
