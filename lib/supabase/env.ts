const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseEnv() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "LensCal is missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the Next.js dev server. NEXT_PUBLIC_SUPABASE_ANON_KEY is also supported for older Supabase projects.",
    );
  }

  return {
    supabaseUrl,
    supabaseKey,
  };
}
