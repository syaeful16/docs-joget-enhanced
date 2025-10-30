import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the Service Role key.
// Use this in API routes, actions, or any trusted server code that needs elevated privileges
// (e.g., writing to Storage buckets regardless of RLS/policies).
// Do NOT import this in client components.

let _admin: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  _admin = createClient(url, serviceKey);
  return _admin;
}

// Optional: safe getter that returns null instead of throwing
export function tryGetSupabaseAdminClient(): SupabaseClient | null {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}
