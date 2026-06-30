import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';

import { palette } from '@/constants/palette';

import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'LensCal',
  description: 'Contact lens replacement tracker',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        <meta name="theme-color" content={palette.ink} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
