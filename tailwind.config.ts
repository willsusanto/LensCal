import type { Config } from 'tailwindcss';

import { palette } from './constants/palette';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './providers/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: palette,
      boxShadow: {
        card: `0 14px 34px ${palette.softShadow}`,
        nav: `0 18px 36px ${palette.shadow}`,
        action: `0 14px 28px ${palette.shadow}`,
        blue: `0 14px 34px ${palette.blueShadow}`,
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
      },
    },
  },
};

export default config;
