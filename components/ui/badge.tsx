import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase leading-none",
  {
    variants: {
      variant: {
        default: "bg-blueDeep text-white",
        secondary: "bg-surfaceBlue text-blueDeep",
        muted: "bg-surfaceSoft text-muted",
        outline: "border border-line bg-surface text-ink",
        warning: "bg-warningBg text-warning",
        destructive: "bg-dangerBg text-danger",
        dark: "bg-ink text-white",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

export type BadgeProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
