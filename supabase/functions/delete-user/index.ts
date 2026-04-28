import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Vidquence <no-reply@vidquence.com>";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

async function sendFarewellEmail(email: string, name: string) {
  if (!RESEND_API_KEY) return;
  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#0b0b10;padding:40px 0">
      <div style="max-width:520px;margin:0 auto;background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
        <div style="background:#f5c518;padding:18px 32px">
          <span style="font-size:18px;font-weight:900;color:#0b0b10">Vidquence</span>
        </div>
        <div style="padding:32px;color:#e8e8f0;line-height:1.6">
          <h2 style="margin:0 0 12px;font-size:22px;color:#e8e8f0">Account Deleted</h2>
          <p style="color:#c8c8d8;margin:0 0 8px">Hi ${name || "there"},</p>
          <p style="color:#c8c8d8;margin:0 0 16px">Your Vidquence account and all associated data have been permanently deleted. We're sorry to see you go.</p>
          <p style="color:#c8c8d8;margin:0">If this was a mistake, you're always welcome to create a new account.</p>
        </div>
        <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#55556a">
          Vidquence · This is an automated message.
        </div>
      </div>
    </div>
  `;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: email, subject: "Your Vidquence account has been deleted", html }),
  }).catch(() => {});
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return new Response("Unauthorized", { status: 401 });

  // Parse reason from request body
  let reason = "";
  let reasonDetail = "";
  try {
    const body = await req.json();
    reason       = body.reason       || "";
    reasonDetail = body.reasonDetail || "";
  } catch {}

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const name  = user.user_metadata?.full_name || user.user_metadata?.name || "";
  const email = user.email || "";

  // Snapshot credits + plan before deletion (best-effort)
  let creditsBalance = null;
  let plan = null;
  let projectCount = 0;
  try {
    const { data: credits } = await adminClient.from("user_credits").select("balance").eq("user_id", user.id).single();
    creditsBalance = credits?.balance ?? null;
    const { data: profile } = await adminClient.from("profiles").select("plan").eq("id", user.id).single();
    plan = profile?.plan ?? null;
    const { count } = await adminClient.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    projectCount = count ?? 0;
  } catch {}

  // Save churn record BEFORE deleting anything
  try {
    await adminClient.from("deleted_users").insert({
      user_id:        user.id,
      email,
      name,
      reason,
      reason_detail:  reasonDetail,
      plan,
      credits_at_deletion: creditsBalance,
      project_count:  projectCount,
      deleted_at:     new Date().toISOString(),
    });
  } catch {}

  // Delete user data
  await adminClient.from("profiles").delete().eq("id", user.id);
  await adminClient.from("user_credits").delete().eq("user_id", user.id);
  await adminClient.from("projects").delete().eq("user_id", user.id);
  await adminClient.from("generated_images").delete().eq("user_id", user.id);

  // Delete auth user
  const { error } = await adminClient.auth.admin.deleteUser(user.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Send farewell email after deletion
  if (email) sendFarewellEmail(email, name);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
