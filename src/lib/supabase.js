import { createClient } from "@supabase/supabase-js";

const supabaseUrl    = import.meta.env?.VITE_SUPABASE_URL    || process.env.VITE_SUPABASE_URL    || process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Guard: in Remotion's webpack render context, import.meta.env is not injected
// by Vite so credentials may be undefined. Return null rather than throw.
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
