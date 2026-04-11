/**
 * creditService.js
 * src/services/credits/creditService.js
 *
 * Client-side credit reads via Supabase (RLS-filtered to own user).
 * Credit deductions happen server-side only — never trust the client.
 */

import { supabase } from "../../lib/supabase";

export async function getCredits() {
  const { data, error } = await supabase
    .from("user_credits")
    .select("balance, lifetime_credits")
    .single();
  if (error) return null;
  return data;
}

export async function getTransactions(limit = 20) {
  const { data } = await supabase
    .from("credit_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
