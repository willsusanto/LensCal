'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Clock, Settings } from 'lucide-react';

import { palette } from '@/constants/palette';

const navItems = [
  { href: '/', label: 'Today', Icon: Calendar },
  { href: '/history', label: 'History', Icon: Clock },
  { href: '/settings', label: 'Settings', Icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div
        className="flex items-center gap-1.5 rounded-full px-2 py-2"
        style={{
          backgroundColor: palette.black,
          boxShadow: `0 18px 36px ${palette.shadow}`,
        }}
      >
        {navItems.map(({ href, label, Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-full px-4 py-2 transition-colors duration-150"
              style={{
                backgroundColor: isActive ? palette.white : 'transparent',
                color: isActive ? palette.black : palette.muted,
              }}
            >
              <Icon size={18} />
              <span className="text-sm font-extrabold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
