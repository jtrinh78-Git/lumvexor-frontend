// SECTION: Imports
import { createClient } from "@supabase/supabase-js";

// SECTION: Env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // This throws early so you see the real problem instead of a silent blank screen.
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

// SECTION: Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// SECTION: dev exposure
if (import.meta.env.DEV) {
  (window as any).supabase = supabase;
}