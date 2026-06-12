import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/landing/logo";

/**
 * Shared shell for legal documents (terms, privacy). Plain, readable
 * typography — these pages are meant to be read, not sold from.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-ink/5 px-6 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex gap-5 text-sm font-medium text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        <div className="legal-body mt-10 space-y-8">{children}</div>
      </main>
      <footer className="border-t border-ink/5 px-6 py-8">
        <p className="mx-auto max-w-3xl text-sm text-muted-foreground/70">
          © {new Date().getFullYear()} Polyshield · <Link href="/" className="hover:text-foreground">polyshield</Link>
        </p>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-foreground/75">{children}</div>
    </section>
  );
}
