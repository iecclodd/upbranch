import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/landing/logo";
import { WaitlistForm } from "@/components/landing/waitlist-form";

const links = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#security", label: "Security" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#211327]/10 bg-[#FAF8F5]/88 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <a href="#" className="shrink-0">
          <Logo />
        </a>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#211327]/70 transition-colors hover:text-[#211327]"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle className="scale-90" />
          <WaitlistForm compact />
        </div>
        <a
          href="#waitlist"
          className="rounded-lg bg-[#211327] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#332039] lg:hidden"
        >
          Join waitlist
        </a>
      </nav>
    </header>
  );
}
