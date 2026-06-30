import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-24 w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm font-bold text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-blueDeep focus:ring-2 focus:ring-blueDeep/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
