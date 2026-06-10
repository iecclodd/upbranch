import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  dark?: boolean;
  className?: string;
}

export function Logo({ dark = false, className }: LogoProps) {
  return (
    <span
      className={cn("flex items-center gap-1.5", className)}
      aria-label="Polyshield"
    >
      <Image
        src="/polyshield_logo_nobg.png"
        alt=""
        width={38}
        height={38}
        priority
      />
      <span
        className={cn(
          "text-lg font-bold tracking-tight transition-colors",
          dark ? "text-white" : "text-foreground",
        )}
      >
        Polyshield
      </span>
    </span>
  );
}
