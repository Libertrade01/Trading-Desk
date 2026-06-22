/**
 * Push Libertrade auth email templates to Supabase via Management API.
 *
 * Usage:
 *   set SUPABASE_ACCESS_TOKEN=...   (from https://supabase.com/dashboard/account/tokens)
 *   node scripts/apply-supabase-email-templates.mjs
 *
 * Optional SMTP (Resend): set RESEND_API_KEY + AUTH_FROM_EMAIL + AUTH_SENDER_NAME
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const projectRef = "uzbsuyknfnzqwdpzspfs";

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

function readTemplate(name) {
  return fs.readFileSync(path.join(root, "supabase", "templates", name), "utf8");
}

const founderUrl = "https://libertrade-desk.vercel.app";
const customerUrl = "https://libertrade-app.vercel.app";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || founderUrl;
const redirectUrls = [
  `${founderUrl}/auth/callback`,
  `${customerUrl}/auth/callback`,
  "http://localhost:3000/auth/callback",
];

const payload = {
  site_url: appUrl,
  uri_allow_list: [...new Set(redirectUrls)].join(","),
  mailer_subjects_confirmation: "Confirm your Libertrade account",
  mailer_templates_confirmation_content: readTemplate("confirm-signup.html"),
  mailer_subjects_recovery: "Reset your Libertrade password",
  mailer_templates_recovery_content: readTemplate("recovery.html"),
};

const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.AUTH_FROM_EMAIL;
if (resendKey && fromEmail) {
  Object.assign(payload, {
    external_email_enabled: true,
    smtp_admin_email: fromEmail,
    smtp_sender_name: process.env.AUTH_SENDER_NAME || "Libertrade",
    smtp_host: "smtp.resend.com",
    smtp_port: 465,
    smtp_user: "resend",
    smtp_pass: resendKey,
  });
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }
);

if (!res.ok) {
  console.error("Failed:", res.status, await res.text());
  process.exit(1);
}

console.log(
  "Updated auth config:",
  "templates, site_url, redirect URLs.",
  resendKey ? "Custom SMTP enabled." : "SMTP unchanged — add RESEND_API_KEY + AUTH_FROM_EMAIL."
);
