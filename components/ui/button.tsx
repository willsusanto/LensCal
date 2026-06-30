import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blueDeep focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-ink text-white shadow-action hover:bg-inkSoft",
        secondary: "border border-line bg-surface text-ink hover:bg-surfaceSoft",
        soft: "bg-surfaceBlue text-blueDeep hover:bg-surfaceBlueStrong",
        ghost: "text-muted hover:bg-surfaceSoft hover:text-ink",
        destructive: "bg-danger text-white hover:opacity-90",
        outline: "border border-line bg-transparent text-ink hover:bg-surfaceSoft",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
