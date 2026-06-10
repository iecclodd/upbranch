import { Logo } from "@/components/landing/logo";

const footerLinks = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "mailto:hello@polyshield.ai" },
];

export function Footer() {
  return (
    <footer className="border-t border-ink/5 px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            The safety layer between AI agents and the real world.
          </p>
        </div>
        <div className="flex flex-col gap-6 md:items-end">
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <p className="text-sm text-muted-foreground/70">
            © {new Date().getFullYear()} Polyshield. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
