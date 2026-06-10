const badges = [
  "MCP Gateway",
  "Policy Engine",
  "Human Approvals",
  "Credential Vault",
  "Audit Logs",
];

export function SocialProof() {
  return (
    <section className="border-b border-[#211327]/10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-sm font-medium text-[#211327]">
          Built for AI builders connecting agents to real tools.
        </p>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-md border border-[#211327]/12 bg-white/70 px-3 py-1.5 text-sm text-[#4B3C52]"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
