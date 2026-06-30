import type { CSSProperties, ReactNode } from 'react';

import { palette } from '@/constants/palette';

export function Card({
  children,
  tone = 'default',
  style,
  className = '',
}: {
  children: ReactNode;
  tone?: 'default' | 'soft' | 'dark';
  style?: CSSProperties;
  className?: string;
}) {
  const toneStyle: CSSProperties =
    tone === 'dark'
      ? { backgroundColor: palette.black, borderColor: palette.black }
      : tone === 'soft'
        ? { backgroundColor: palette.surfaceBlue, borderColor: palette.line }
        : { backgroundColor: palette.surface, borderColor: palette.line };

  return (
    <div
      className={`rounded-lg border p-4 ${className}`}
      style={{ boxShadow: `0 14px 34px ${palette.softShadow}`, ...toneStyle, ...style }}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = 'secondary',
}: {
  children: ReactNode;
  tone?: 'primary' | 'secondary' | 'dark' | 'danger' | 'warning';
}) {
  const toneStyle = {
    primary: { backgroundColor: palette.blueDeep, color: palette.white },
    secondary: { backgroundColor: palette.surfaceBlue, color: palette.blueDeep },
    dark: { backgroundColor: palette.black, color: palette.white },
    danger: { backgroundColor: palette.dangerBg, color: palette.danger },
    warning: { backgroundColor: palette.warningBg, color: palette.warning },
  }[tone];

  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-[11px] font-black uppercase"
      style={toneStyle}
    >
      {children}
    </span>
  );
}
