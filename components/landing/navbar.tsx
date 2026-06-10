"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/landing/logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav
        aria-label="Main navigation"
        className={cn(
          "mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full px-3 pl-5 transition-all duration-300",
          scrolled
            ? "bg-white/75 shadow-chip ring-1 ring-ink/5 backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <a href="#top" className="shrink-0">
          <Logo />
        </a>
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/65 transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
        <a
          href="#waitlist"
          className="rounded-full bg-ink px-[18px] py-2 text-sm font-semibold text-white transition-all hover:scale-[1.03] hover:bg-plum"
        >
          Join waitlist
        </a>
      </nav>
    </header>
  );
}
