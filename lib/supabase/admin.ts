import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from '@/lib/supabase/env';

export function createAdminClient() {
  const adminKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminKey) {
    throw new Error(
      'SUPABASE_SECRET_KEY or legacy SUPABASE_SERVICE_ROLE_KEY is required for server-side Supabase admin access.',
    );
  }

  const { supabaseUrl } = getSupabaseEnv();

  return createSupabaseClient(supabaseUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
