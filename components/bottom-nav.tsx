"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Clock, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Today", Icon: Calendar },
  { href: "/history", label: "History", Icon: Clock },
  { href: "/settings", label: "Settings", Icon: Settings },
] as const;

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-line bg-surface/95 px-5 py-6 shadow-card backdrop-blur md:flex md:flex-col">
        <Link href="/" className="mb-8 flex items-center gap-3 rounded-lg px-2 py-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-lg font-black text-white">
            L
          </div>
          <div className="min-w-0">
            <p className="text-xl font-black leading-tight text-ink">LensCal</p>
            <p className="text-xs font-extrabold text-muted">Softlens care</p>
          </div>
        </Link>

        <nav className="flex flex-col gap-1.5">
          {navItems.map(({ href, label, Icon }) => {
            const isActive = isActivePath(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-black transition-colors",
                  isActive
                    ? "bg-ink text-white shadow-action"
                    : "text-muted hover:bg-surfaceSoft hover:text-ink",
                )}
              >
                <Icon size={19} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="grid w-full max-w-sm grid-cols-3 gap-1.5 rounded-full bg-ink p-2 shadow-nav">
          {navItems.map(({ href, label, Icon }) => {
            const isActive = isActivePath(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-black transition-colors",
                  isActive ? "bg-white text-ink" : "text-muted hover:text-white",
                )}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
