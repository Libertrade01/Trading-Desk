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
const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  console.error("Missing SUPABASE_PROJECT_REF");
  process.exit(1);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

function readTemplate(name) {
  return fs.readFileSync(path.join(root, "supabase", "templates", name), "utf8");
}

const founderUrl = "https://libertrade-desk.vercel.app";
const customerUrl = "https://libertrade.app";
const legacyCustomerUrl = "https://libertrade-app.vercel.app";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || customerUrl;
const redirectUrls = [
  `${founderUrl}/auth/callback`,
  `${founderUrl}/auth/recovery`,
  `${founderUrl}/reset-password`,
  `${customerUrl}/auth/callback`,
  `${customerUrl}/auth/recovery`,
  `${customerUrl}/reset-password`,
  `${legacyCustomerUrl}/auth/callback`,
  `${legacyCustomerUrl}/auth/recovery`,
  `${legacyCustomerUrl}/reset-password`,
  "http://localhost:3000/auth/callback",
  "http://localhost:3000/auth/recovery",
  "http://localhost:3000/reset-password",
];

const payload = {
  site_url: appUrl,
  uri_allow_list: [...new Set(redirectUrls)].join(","),
  mailer_subjects_confirmation: "Confirm your Libertrade account",
  mailer_templates_confirmation_content: readTemplate("confirm-signup.html"),
  mailer_subjects_recovery: "Reset your Libertrade password",
  mailer_templates_recovery_content: readTemplate("recovery.html"),
  mailer_subjects_invite: "You have been invited to Libertrade",
  mailer_templates_invite_content: readTemplate("secure-action.html"),
  mailer_subjects_magic_link: "Your secure Libertrade sign-in link",
  mailer_templates_magic_link_content: readTemplate("secure-action.html"),
  mailer_subjects_email_change: "Confirm your Libertrade email change",
  mailer_templates_email_change_content: readTemplate("secure-action.html"),
  mailer_subjects_reauthentication: "Your Libertrade verification code",
  mailer_templates_reauthentication_content: readTemplate("verification-code.html"),
  mailer_subjects_password_changed_notification: "Your Libertrade password was changed",
  mailer_templates_password_changed_notification_content: readTemplate("security-notification.html"),
  mailer_subjects_email_changed_notification: "Your Libertrade email was changed",
  mailer_templates_email_changed_notification_content: readTemplate("security-notification.html"),
  mailer_subjects_phone_changed_notification: "Your Libertrade phone number was changed",
  mailer_templates_phone_changed_notification_content: readTemplate("security-notification.html"),
  mailer_subjects_identity_linked_notification: "A sign-in identity was linked to Libertrade",
  mailer_templates_identity_linked_notification_content: readTemplate("security-notification.html"),
  mailer_subjects_identity_unlinked_notification: "A sign-in identity was unlinked from Libertrade",
  mailer_templates_identity_unlinked_notification_content: readTemplate("security-notification.html"),
  mailer_subjects_mfa_factor_enrolled_notification: "A security factor was added to Libertrade",
  mailer_templates_mfa_factor_enrolled_notification_content: readTemplate("security-notification.html"),
  mailer_subjects_mfa_factor_unenrolled_notification: "A security factor was removed from Libertrade",
  mailer_templates_mfa_factor_unenrolled_notification_content: readTemplate("security-notification.html"),
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
