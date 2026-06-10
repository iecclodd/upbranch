import { Logo } from "@/components/landing/logo";

const footerLinks = ["Product", "Docs", "Security", "GitHub", "Contact"];

export function Footer() {
  return (
    <footer className="border-t border-[#211327]/10 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-md text-sm leading-6 text-[#6B7280]">
            Polyshield routes every AI agent action through policies, approvals,
            and audit logs.
          </p>
        </div>
        <nav className="flex flex-wrap gap-4" aria-label="Footer navigation">
          {footerLinks.map((link) => (
            <a
              key={link}
              href={link === "Contact" ? "mailto:hello@polyshield.ai" : "#"}
              className="text-sm font-medium text-[#6B7280] transition-colors hover:text-[#211327]"
            >
              {link}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
