import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "hello@vidquence.com";
const FROM_EMAIL  = process.env.FROM_EMAIL || "Vidquence <no-reply@vidquence.com>";

/* ── Base senders ──────────────────────────────────────────── */

export async function sendAdminAlert(subject, html) {
  try {
    await resend.emails.send({ from: FROM_EMAIL, to: ADMIN_EMAIL, subject: `[Vidquence] ${subject}`, html });
  } catch (err) {
    console.error("[email] Admin alert failed:", err.message);
  }
}

export async function sendUserEmail(to, subject, html) {
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (err) {
    console.error("[email] User email failed:", err.message);
  }
}

/* ── Shared style ─────────────────────────────────────────── */

const APP_URL = process.env.APP_URL || "https://vidquence.com";

function wrap(body) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#0b0b10;padding:40px 0;min-height:100vh">
      <div style="max-width:520px;margin:0 auto;background:#111118;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
        <div style="background:#f5c518;padding:18px 32px">
          <a href="${APP_URL}" style="text-decoration:none"><span style="font-size:18px;font-weight:900;color:#0b0b10;letter-spacing:-0.5px">Vidquence</span></a>
        </div>
        <div style="padding:32px;color:#e8e8f0;line-height:1.6">
          ${body}
        </div>
        <div style="padding:24px 32px;border-top:1px solid rgba(255,255,255,0.06)">
          <div style="margin-bottom:14px">
            <a href="${APP_URL}" style="font-size:12px;color:#7c5cfc;text-decoration:none;margin-right:16px">Dashboard</a>
            <a href="${APP_URL}/credits" style="font-size:12px;color:#7c5cfc;text-decoration:none;margin-right:16px">Credits</a>
            <a href="${APP_URL}/settings" style="font-size:12px;color:#7c5cfc;text-decoration:none;margin-right:16px">Settings</a>
            <a href="${APP_URL}/feedback" style="font-size:12px;color:#7c5cfc;text-decoration:none">Feedback</a>
          </div>
          <div style="margin-bottom:14px">
            <a href="${APP_URL}/privacy" style="font-size:11px;color:#55556a;text-decoration:none;margin-right:16px">Privacy Policy</a>
            <a href="${APP_URL}/terms" style="font-size:11px;color:#55556a;text-decoration:none;margin-right:16px">Terms of Service</a>
            <a href="${APP_URL}/refunds" style="font-size:11px;color:#55556a;text-decoration:none">Refund Policy</a>
          </div>
          <p style="font-size:11px;color:#44444f;margin:0;line-height:1.5">
            You are receiving this email because you have an account on Vidquence.<br>
            © ${new Date().getFullYear()} Vidquence. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  `;
}

function adminWrap(body) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f5;padding:40px 0;min-height:100vh">
      <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden">
        <div style="background:#0b0b10;padding:16px 28px;display:flex;align-items:center;gap:8px">
          <span style="font-size:14px;font-weight:800;color:#f5c518;letter-spacing:-0.3px">Vidquence</span>
          <span style="font-size:11px;color:#55556a;margin-left:6px;background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:4px">ADMIN</span>
        </div>
        <div style="padding:28px;color:#111118;line-height:1.6">
          ${body}
        </div>
        <div style="padding:16px 28px;border-top:1px solid #f0f0f0;font-size:11px;color:#a1a1aa">
          ${new Date().toUTCString()}
        </div>
      </div>
    </div>
  `;
}

function row(label, value) {
  return `<tr><td style="padding:6px 0;color:#71717a;font-size:13px;width:130px">${label}</td><td style="padding:6px 0;color:#111118;font-size:13px;font-weight:600">${value}</td></tr>`;
}

/* ── Admin templates ───────────────────────────────────────── */

export function adminNewUserEmail({ id, email, name }) {
  return {
    subject: `New User — ${email}`,
    html: adminWrap(`
      <h2 style="margin:0 0 16px;font-size:18px;color:#111118">New User Signed Up</h2>
      <table style="width:100%;border-collapse:collapse">
        ${row("Email", email)}
        ${row("Name", name || "—")}
        ${row("User ID", `<span style="font-family:monospace;font-size:12px">${id}</span>`)}
      </table>
    `),
  };
}

export function adminUserDeletedEmail({ id, email, reason = "", reasonDetail = "" }) {
  const reasonText = reason ? (reasonDetail ? `${reason} — ${reasonDetail}` : reason) : "—";
  return {
    subject: `Account Deleted — ${email}`,
    html: adminWrap(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#ef4444">User Deleted Account</h2>
      <p style="color:#71717a;font-size:13px;margin:0 0 16px">The user has permanently deleted their account and all associated data.</p>
      <table style="width:100%;border-collapse:collapse">
        ${row("Email", email || "—")}
        ${row("User ID", `<span style="font-family:monospace;font-size:12px">${id}</span>`)}
        ${row("Reason", reasonText)}
      </table>
    `),
  };
}

export function adminNewSaleEmail({ userEmail, plan, amount, credits }) {
  return {
    subject: `New Sale — ${plan} — $${amount}`,
    html: adminWrap(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#16a34a">New Plan Purchase 💰</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        ${row("User", userEmail)}
        ${row("Plan", plan)}
        ${row("Amount", `$${amount}`)}
        ${row("Credits", credits)}
      </table>
    `),
  };
}

export function adminPlanRenewalEmail({ userEmail, plan, amount }) {
  return {
    subject: `Plan Renewal — ${plan} — $${amount}`,
    html: adminWrap(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#2563eb">Plan Renewed 🔁</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        ${row("User", userEmail)}
        ${row("Plan", plan)}
        ${row("Amount", `$${amount}`)}
      </table>
    `),
  };
}

export function adminPlanUpgradeEmail({ userEmail, fromPlan, toPlan, amount }) {
  return {
    subject: `Plan Upgrade — ${fromPlan} → ${toPlan}`,
    html: adminWrap(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#7c3aed">Plan Upgraded ⬆️</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        ${row("User", userEmail)}
        ${row("From", fromPlan)}
        ${row("To", toPlan)}
        ${row("Amount", `$${amount}`)}
      </table>
    `),
  };
}

export function adminCreditsTopupEmail({ userEmail, amount, balance }) {
  return {
    subject: `Credits Top-up — ${userEmail}`,
    html: adminWrap(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#d97706">Credits Added ⚡</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        ${row("User", userEmail)}
        ${row("Added", `${amount} credits`)}
        ${row("New Balance", `${balance} credits`)}
      </table>
    `),
  };
}

/* ── User templates ────────────────────────────────────────── */

export function userWelcomeEmail(name) {
  return {
    subject: "Welcome to Vidquence 🎬",
    html: wrap(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#f5c518">Welcome, ${name || "Creator"}!</h2>
      <p style="color:#c8c8d8;margin:0 0 16px">Your account is ready. You've got <strong style="color:#f5c518">50 free credits</strong> to get started — enough to create several AI-powered videos.</p>
      <p style="color:#c8c8d8;margin:0 0 24px">Head to your dashboard and create your first short.</p>
      <a href="${APP_URL}" style="display:inline-block;background:#f5c518;color:#0b0b10;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Go to Dashboard →</a>
    `),
  };
}

export function userCreditsPurchasedEmail(name, amount, balance) {
  return {
    subject: `${amount} credits added to your account`,
    html: wrap(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#f5c518">Credits Added ⚡</h2>
      <p style="color:#c8c8d8;margin:0 0 8px">Hi ${name || "there"},</p>
      <p style="color:#c8c8d8;margin:0 0 16px"><strong style="color:#e8e8f0">${amount} credits</strong> have been added to your account.</p>
      <div style="background:#0b0b10;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px 20px;margin:0 0 24px">
        <div style="font-size:12px;color:#55556a;letter-spacing:1px;margin-bottom:4px">CURRENT BALANCE</div>
        <div style="font-size:36px;font-weight:900;color:#f5c518">${balance}</div>
        <div style="font-size:13px;color:#8888a8">credits</div>
      </div>
      <a href="${APP_URL}" style="display:inline-block;background:#f5c518;color:#0b0b10;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Start Creating →</a>
    `),
  };
}

export function userLowCreditsEmail(name, balance) {
  return {
    subject: "Your Vidquence credits are running low",
    html: wrap(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#f97316">Low Credits ⚠️</h2>
      <p style="color:#c8c8d8;margin:0 0 8px">Hi ${name || "there"},</p>
      <p style="color:#c8c8d8;margin:0 0 16px">You have <strong style="color:#f97316">${balance} credits</strong> remaining. Top up to keep creating without interruption.</p>
      <a href="${APP_URL}/pricing" style="display:inline-block;background:#f5c518;color:#0b0b10;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Top Up Credits →</a>
    `),
  };
}

export function userAccountDeletedEmail(name) {
  return {
    subject: "Your Vidquence account has been deleted",
    html: wrap(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#e8e8f0">Account Deleted</h2>
      <p style="color:#c8c8d8;margin:0 0 8px">Hi ${name || "there"},</p>
      <p style="color:#c8c8d8;margin:0 0 16px">Your Vidquence account and all associated data have been permanently deleted. We're sorry to see you go.</p>
      <p style="color:#c8c8d8;margin:0">If this was a mistake or you'd like to come back, you're always welcome to create a new account.</p>
    `),
  };
}

export function userPlanUpgradeEmail(name, fromPlan, toPlan, credits) {
  return {
    subject: `You've upgraded to ${toPlan}`,
    html: wrap(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#a78bfa">Plan Upgraded ⬆️</h2>
      <p style="color:#c8c8d8;margin:0 0 8px">Hi ${name || "there"},</p>
      <p style="color:#c8c8d8;margin:0 0 16px">Your plan has been upgraded from <strong style="color:#e8e8f0">${fromPlan}</strong> to <strong style="color:#a78bfa">${toPlan}</strong>. ${credits} credits have been added to your account.</p>
      <a href="${APP_URL}" style="display:inline-block;background:#f5c518;color:#0b0b10;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Start Creating →</a>
    `),
  };
}

export function userPlanRenewalEmail(name, plan, credits, nextRenewal) {
  return {
    subject: `Your ${plan} plan has been renewed`,
    html: wrap(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#34d399">Plan Renewed 🔁</h2>
      <p style="color:#c8c8d8;margin:0 0 8px">Hi ${name || "there"},</p>
      <p style="color:#c8c8d8;margin:0 0 16px">Your <strong style="color:#e8e8f0">${plan}</strong> plan has been renewed and <strong style="color:#34d399">${credits} credits</strong> have been added to your account.</p>
      <p style="color:#c8c8d8;margin:0 0 24px">Next renewal: <strong style="color:#e8e8f0">${nextRenewal}</strong></p>
      <a href="${APP_URL}" style="display:inline-block;background:#f5c518;color:#0b0b10;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Start Creating →</a>
    `),
  };
}

export function userPaymentFailedEmail(name, plan) {
  return {
    subject: "Payment failed — action required",
    html: wrap(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#ef4444">Payment Failed ❌</h2>
      <p style="color:#c8c8d8;margin:0 0 8px">Hi ${name || "there"},</p>
      <p style="color:#c8c8d8;margin:0 0 16px">We were unable to process your payment for the <strong style="color:#e8e8f0">${plan}</strong> plan. Please update your payment method to keep your subscription active.</p>
      <a href="${APP_URL}/pricing" style="display:inline-block;background:#ef4444;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Update Payment →</a>
    `),
  };
}

export function userPlanExpiringEmail(name, plan, expiryDate, creditsBalance) {
  const creditsNote = creditsBalance != null
    ? `<p style="color:#c8c8d8;margin:0 0 16px">You currently have <strong style="color:#f5c518">${creditsBalance} credits</strong> remaining — they never expire, but renewing keeps premium features unlocked and lets you top up.</p>`
    : "";
  return {
    subject: `Your ${plan} plan expires soon`,
    html: wrap(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#f97316">Plan Expiring Soon ⏳</h2>
      <p style="color:#c8c8d8;margin:0 0 8px">Hi ${name || "there"},</p>
      <p style="color:#c8c8d8;margin:0 0 16px">Your <strong style="color:#e8e8f0">${plan}</strong> plan expires on <strong style="color:#f97316">${expiryDate}</strong>. Renew now to keep access to all features.</p>
      ${creditsNote}<a href="${APP_URL}/pricing" style="display:inline-block;background:#f5c518;color:#0b0b10;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Renew Plan →</a>
    `),
  };
}

export function userPlanExpiredEmail(name, plan, creditsBalance) {
  const creditsNote = creditsBalance != null && creditsBalance > 0
    ? `<p style="color:#c8c8d8;margin:0 0 16px">The good news: your <strong style="color:#f5c518">${creditsBalance} remaining credits</strong> never expire — they'll be right here when you renew. Premium features like Product Ad Studio will reactivate the moment your plan is live again.</p>`
    : "";
  return {
    subject: `Your ${plan} plan has expired`,
    html: wrap(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#ef4444">Plan Expired</h2>
      <p style="color:#c8c8d8;margin:0 0 8px">Hi ${name || "there"},</p>
      <p style="color:#c8c8d8;margin:0 0 16px">Your <strong style="color:#e8e8f0">${plan}</strong> plan has expired.</p>
      ${creditsNote}<a href="${APP_URL}/pricing" style="display:inline-block;background:#f5c518;color:#0b0b10;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">Resubscribe →</a>
    `),
  };
}

export function userRenderCompleteEmail(name, videoUrl, projectName) {
  const trimmed = projectName ? (projectName.length > 40 ? projectName.slice(0, 38).trimEnd() + "…" : projectName) : null;
  const subject = trimmed ? `${trimmed} — render complete 🎬` : "Your video is ready 🎬";
  return {
    subject,
    html: wrap(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#f5c518">Video Ready! 🎬</h2>
      <p style="color:#c8c8d8;margin:0 0 8px">Hi ${name || "there"},</p>
      ${projectName ? `<p style="color:#c8c8d8;margin:0 0 4px">Your video <strong style="color:#e8e8f0">${projectName}</strong> has finished rendering and is ready to download.</p>` : `<p style="color:#c8c8d8;margin:0 0 24px">Your video has finished rendering and is ready to download.</p>`}
      ${projectName ? `<p style="color:#77777f;font-size:12px;margin:0 0 24px">Render complete · Vidquence</p>` : ""}
      <a href="${videoUrl || APP_URL}" style="display:inline-block;background:#f5c518;color:#0b0b10;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">View Video →</a>
    `),
  };
}
