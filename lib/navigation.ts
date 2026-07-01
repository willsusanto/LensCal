export function getSafeRedirectPath(value: string | null | undefined, fallback = '/') {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;

  try {
    const base = new URL('https://lenscal.local');
    const url = new URL(value, base);
    if (url.origin !== base.origin) return fallback;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
