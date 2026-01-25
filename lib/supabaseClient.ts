import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * IMPORTANT:
 * - NEXT_PUBLIC_* variables are exposed to the browser.
 * - Use ONLY the anon key here (never service_role).
 */

let cachedClient: SupabaseClient | null = null;

function getEnv(name: string): string | null {
  const v = process.env[name];
  if (!v) return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

/**
 * Returns a Supabase client if env vars exist, otherwise null.
 * Prevents Vercel build crashes when env vars are missing.
 */
export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    return null;
  }

  cachedClient = createClient(url, anonKey);
  return cachedClient;
}
