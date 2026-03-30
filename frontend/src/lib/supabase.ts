import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn("[AUTH] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

// Use safe placeholders to avoid runtime crashes when env vars are missing.
const safeUrl = supabaseUrl || "http://localhost:54321";
const safeAnonKey = supabaseAnonKey || "public-anon-key-placeholder";

export const supabase = createClient(safeUrl, safeAnonKey);
