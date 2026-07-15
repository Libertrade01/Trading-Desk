# Libertrade beta launch checklist

Status date: 14 July 2026

## Completed in the codebase

- [x] Beta Terms, Privacy Notice and Cookie Notice
- [x] Legal links included in the live landing-page footer and signup flow
- [x] Legal identity kept inside the legal documents rather than promoted on the homepage
- [x] Product wording clearly limited to journaling, analytics and educational review
- [x] Date-of-birth eligibility check with under-14 rejection
- [x] Only the age group `14-17` or `18+` is retained
- [x] Server-side signup validation
- [x] Versioned Terms and Privacy acceptance metadata
- [x] Database migration for durable legal-acceptance records
- [x] Request-only user-data export workflow with no in-app export button
- [x] Confirmed account-deletion workflow
- [x] Public-page-only Vercel Web Analytics integration with no analytics cookies
- [x] Security headers for framing, MIME sniffing, referrers and browser permissions
- [x] Public sitemap, canonical production domain and robots rules
- [x] Authentication pages excluded from indexing
- [x] Next.js upgraded to the patched release
- [x] Dependency audit reports zero known vulnerabilities
- [x] Production build passes
- [x] Full automated test suite passes, including under-14 boundary tests
- [x] Landing, signup, legal, robots and sitemap routes return successfully in local smoke tests
- [x] Optional wearable consent included in onboarding and Settings
- [x] HRV and Sleep Debt fields remain hidden unless wearable tracking is enabled
- [x] Wearable consent is versioned, timestamped and revocable
- [x] Vercel access restored and `libertrade-app` production configuration audited
- [x] Duplicate Vercel projects confirmed to deploy the same repository and commit
- [x] Single-project founder architecture verified with server-side email authorization
- [x] Founder features configured to fail closed in production
- [x] `libertrade.app` and `www.libertrade.app` attached to the Vercel project
- [x] Production application URL and authentication secret configured
- [x] Production Supabase Site URL and redirect allow-list use `https://libertrade.app`
- [x] Branded signup-confirmation and password-recovery email templates installed
- [x] Email confirmation remains mandatory
- [x] Legal-acceptance migration applied to production and verified
- [x] Live RLS audit confirms protection on core user-data tables
- [x] Vercel Web Analytics enabled and restricted in code to public pages
- [x] ImprovMX configured to receive and forward mail for `support@libertrade.app`

## Needs the operator's answer or approval

- [ ] Approve retiring the duplicate `trading-desk` Vercel project after production cutover is verified
- [ ] Complete or approve the Resend account used for Supabase transactional email
- [ ] Add and verify Resend's sending MX, SPF, DKIM and DMARC records

## External legal and business actions

- [ ] Complete the ICO data-protection fee self-assessment if UK data-protection rules apply
- [ ] Obtain a narrow FCA perimeter review before expanding AI features beyond retrospective process analysis
- [ ] Check the availability of the Libertrade name and relevant trademarks in intended markets
- [ ] Revisit the company structure before meaningful paid revenue, brokerage connections, investors or substantial scale

## Production verification after approval

- [x] Confirm `libertrade.app` and `www.libertrade.app` resolve to Vercel over HTTPS
- [x] Confirm the root domain is canonical and `www` redirects correctly
- [ ] Confirm `support@libertrade.app` can send and receive mail
- [ ] Confirm SPF, DKIM and DMARC pass
- [x] Apply the legal-acceptance migration and rerun the live RLS audit
- [x] Confirm production email verification is mandatory
- [ ] Test signup, confirmation, sign-in, password reset and sign-out
- [ ] Test a second user and confirm there is no cross-account data access
- [ ] Test a dummy export and deletion request end to end
- [x] Confirm analytics is enabled and the integration filters to public page views only
- [ ] Test landing, signup and legal pages on phone, tablet and desktop
- [ ] Review logs after the first beta users and establish an incident-response contact process
