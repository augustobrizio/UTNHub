import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Badge (shadcn/ui). Variantes adaptadas a la paleta UTN: el acento es el
 * celeste institucional; `neutral` para metadatos discretos.
 */
type BadgeVariant = "celeste" | "neutral" | "outline";

const VARIANTS: Record<BadgeVariant, string> = {
  celeste: "bg-[#1CA4DF]/10 text-[#4EC0EC] border-transparent",
  neutral: "bg-white/[0.04] text-neutral-400 border-transparent",
  outline: "text-neutral-300 border-white/15",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
