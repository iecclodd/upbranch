import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  ["Learn", "/learn"],
  ["Labs", "/labs"],
  ["Projects", "/discover"],
  ["Radar", "/radar"],
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="upbranch">
      <a className="ub-skip" href="#main-content">Skip to content</a>
      <header className="ub-header">
        <div className="ub-header-inner">
          <Link className="ub-logo" href="/" aria-label="Upbranch home"><span className="ub-logo-mark" aria-hidden="true">✳</span> upbranch<span className="ub-logo-dot">.</span></Link>
          <nav className="ub-desktop-nav" aria-label="Main navigation">
            {navigation.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
          </nav>
          <details className="ub-mobile-nav">
            <summary aria-label="Navigation menu"><span></span><span></span></summary>
            <nav aria-label="Mobile navigation">
              {navigation.map(([label, href]) => <Link key={href} href={href}>{label} <span aria-hidden="true">↗</span></Link>)}
            </nav>
          </details>
        </div>
      </header>
      {children}
      <footer className="ub-footer">
        <div className="ub-footer-top">
          <Link className="ub-logo ub-footer-logo" href="/" aria-label="Upbranch home"><span className="ub-logo-mark" aria-hidden="true">✳</span> upbranch<span className="ub-logo-dot">.</span></Link>
          <nav className="ub-footer-links" aria-label="More navigation">
            <Link href="/paths">Paths</Link>
            <Link href="/studio">Studio</Link>
            <Link href="/portfolio">Progress</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
