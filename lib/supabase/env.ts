const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function validateSupabaseUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS in production.");
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS unless it points at localhost.");
  }

  return url.toString().replace(/\/$/, "");
}

export function getSupabaseEnv() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "LensCal is missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart the Next.js dev server. NEXT_PUBLIC_SUPABASE_ANON_KEY is also supported for older Supabase projects.",
    );
  }

  return {
    supabaseUrl: validateSupabaseUrl(supabaseUrl),
    supabaseKey,
  };
}
