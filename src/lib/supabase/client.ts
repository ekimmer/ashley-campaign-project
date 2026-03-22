import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build/SSG, return a dummy client that won't be used
    // This prevents build failures when env vars aren't available
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "Not configured" } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ limit: () => ({ single: () => ({ data: null, error: null }) }), data: [], error: null }), single: () => ({ data: null, error: null }), order: () => ({ data: [], error: null, limit: () => ({ single: () => ({ data: null, error: null }) }) }), gte: () => ({ order: () => ({ data: [], error: null }) }), data: [], error: null }), data: [], error: null, count: 0 }),
        insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }), data: null, error: null }),
        update: () => ({ eq: () => ({ data: null, error: null }) }),
        delete: () => ({ eq: () => ({ data: null, error: null }) }),
      }),
    } as unknown as SupabaseClient;
  }

  _client = createBrowserClient(url, key);
  return _client;
}
