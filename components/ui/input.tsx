import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-blueDeep focus:ring-2 focus:ring-blueDeep/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
