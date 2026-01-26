import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * IMPORTANT:
 * - NEXT_PUBLIC_* variables are exposed to the browser.
 * - Use ONLY the "anon" key here (never service_role).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
