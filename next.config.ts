import withPWA from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Strict mode for catching React issues early
  reactStrictMode: true,
};

export default withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // Disable service worker in dev to avoid caching stale responses
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
