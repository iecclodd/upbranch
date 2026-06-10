const tools = ["GitHub", "Slack", "Stripe", "Gmail", "Notion", "Linear", "Postgres"];

export function SocialProof() {
  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Gate every tool your agents already touch
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {tools.map((tool) => (
            <span
              key={tool}
              className="text-lg font-semibold tracking-tight text-foreground/35 transition-colors hover:text-foreground/60"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
