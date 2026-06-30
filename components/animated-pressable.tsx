import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AnimatedPressableProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function AnimatedPressable({
  children,
  className,
  ...props
}: AnimatedPressableProps) {
  return (
    <button
      {...props}
      className={cn("transition-[transform,opacity] duration-100 active:scale-[0.985] active:opacity-95", className)}
    >
      {children}
    </button>
  );
}
