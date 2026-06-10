import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  dark?: boolean;
  className?: string;
}

export function Logo({ dark = false, className }: LogoProps) {
  return (
    <span
      className={cn("flex items-center gap-2", className)}
      aria-label="Polyshield"
    >
      <Image
        src="/polyshield_logo_nobg.png"
        alt=""
        width={30}
        height={30}
        priority
      />
      <span
        className={cn(
          "text-[17px] font-bold tracking-tight",
          dark ? "text-white" : "text-foreground",
        )}
      >
        Polyshield
      </span>
    </span>
  );
}
