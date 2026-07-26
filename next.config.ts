import withPWA, { runtimeCaching } from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';
import path from 'node:path';

function getSupabaseConnectSources() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value || !value.startsWith('http')) return [];

  try {
    const url = new URL(value);
    const websocketProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return [url.origin, `${websocketProtocol}//${url.host}`];
  } catch {
    return [];
  }
}

function getContentSecurityPolicy() {
  const isProduction = process.env.NODE_ENV === 'production';
  const connectSources = ["'self'", ...getSupabaseConnectSources()];
  const scriptSources = ["'self'", "'unsafe-inline'"];

  if (!isProduction) {
    scriptSources.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src ${connectSources.join(' ')}`,
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
  ];

  if (isProduction) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

const nextConfig: NextConfig = {
  // Strict mode for catching React issues early
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
      {
        source: '/api/health',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
          {
            key: 'X-LensCal-Origin',
            value: 'next-health',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-LensCal-Origin',
            value: 'next',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: getContentSecurityPolicy(),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

const deploySafeRuntimeCaching = runtimeCaching.filter((cache) => {
  const cacheName = cache.options?.cacheName;
  return ![
    'start-url',
    'pages',
    'pages-rsc',
    'pages-rsc-prefetch',
    'next-data',
  ].includes(cacheName ?? '');
});

export default withPWA({
  dest: 'public',
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  cacheStartUrl: false,
  dynamicStartUrl: false,
  reloadOnOnline: true,
  workboxOptions: {
    runtimeCaching: deploySafeRuntimeCaching,
  },
  // Disable service worker in dev to avoid caching stale responses
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
