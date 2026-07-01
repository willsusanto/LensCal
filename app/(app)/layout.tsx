import type { ReactNode } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { LensProvider } from "@/providers/lens-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <LensProvider>
      <div className="min-h-dvh bg-background md:pl-72">
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 md:pb-10 md:pt-8 lg:px-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </LensProvider>
  );
}
