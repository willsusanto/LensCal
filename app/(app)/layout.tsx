import type { ReactNode } from 'react';

import { BottomNav } from '@/components/bottom-nav';
import { LensProvider } from '@/providers/lens-provider';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <LensProvider>
      <div className="min-h-screen pb-28">{children}</div>
      <BottomNav />
    </LensProvider>
  );
}
