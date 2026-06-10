import Image from "next/image";
import { existsSync } from "node:fs";
import { join } from "node:path";

interface LogoProps {
  dark?: boolean;
}

export function Logo({ dark = false }: LogoProps) {
  const fileName = dark ? "polyshield-logo-white.png" : "polyshield-logo.png";
  const hasLogo = existsSync(join(process.cwd(), "public", fileName));

  return (
    <div className="flex items-center gap-2.5" aria-label="Polyshield">
      <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-[#211327]/10 bg-white">
        {hasLogo ? (
          <Image
            src={`/${fileName}`}
            alt=""
            fill
            sizes="32px"
            className="object-contain p-1.5"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-sm font-semibold text-[#6D35D4]">
            P
          </span>
        )}
      </div>
      <span className={dark ? "font-semibold text-white" : "font-semibold text-[#211327]"}>
        Polyshield
      </span>
    </div>
  );
}
