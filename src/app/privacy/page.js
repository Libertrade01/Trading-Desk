import LegalPage, { LegalNotice, LegalSection } from "@/components/LegalPage";
import { LEGAL_OPERATOR, PRIVACY_EMAIL, PRIVACY_VERSION, TRADING_NAME } from "@/lib/legal";

export const metadata = { title: "Privacy Notice | Libertrade", description: "How Libertrade handles personal information." };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="PRIVACY / YOUR DATA" title="Privacy, without the fine-print fog." intro="This notice explains what Libertrade collects during the beta, why we use it, and the choices you have." effective={PRIVACY_VERSION}>
      <LegalNotice><strong>Data controller:</strong> {LEGAL_OPERATOR}, trading as {TRADING_NAME}.<br /><strong>Privacy contact:</strong> <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a></LegalNotice>

      <LegalSection title="1. Information we collect">
        <ul>
          <li><strong>Account information:</strong> email address, preferred name or nickname, authentication records, and the age group 14–17 or 18+.</li>
          <li><strong>Trading and journal information:</strong> imported executions, plans, levels, tags, notes, reviews, performance statistics and prop-account records you choose to add.</li>
          <li><strong>Readiness information:</strong> optional check-in information such as sleep, energy, mindset, recovery and process scores. If you enable wearable tracking, this also includes the HRV and Sleep Debt readings you choose to enter. These may be treated as sensitive health-related information.</li>
          <li><strong>Technical information:</strong> security logs, device and browser information, approximate network information, essential session cookies and aggregate public-page analytics.</li>
          <li><strong>Support information:</strong> messages, requests and feedback you send to us.</li>
        </ul>
        <p>Your date of birth is used only to confirm eligibility during signup and is then discarded. We retain only your age group and verification time, not your complete birth date.</p>
      </LegalSection>

      <LegalSection title="2. Why we use it">
        <p>We process information to create and secure your account, provide the journal and analytics features, generate the reports you request, respond to support enquiries, prevent abuse, and improve the beta.</p>
        <p>Depending on the information and your location, our legal bases may include performing our agreement with you, our legitimate interests in operating and securing the service, your consent for optional processing, and compliance with legal obligations. We rely on your explicit electronic consent before enabling wearable HRV and Sleep Debt tracking.</p>
      </LegalSection>

      <LegalSection title="3. AI and third-party providers">
        <p>Libertrade uses infrastructure, aggregate public-page analytics and authentication providers including Vercel and Supabase. If you deliberately use LOOP Intelligence, relevant account context may be sent to the connected AI service to answer your request. Do not submit information about another person without permission.</p>
        <p>We do not sell your personal information. Providers may process information in other countries under their contractual safeguards and applicable transfer protections.</p>
      </LegalSection>

      <LegalSection title="4. Retention and security">
        <p>Account information and user-created content are generally retained while your account remains open and until you request deletion. Limited backups, security records or information required for legal claims may remain for an additional period.</p>
        <p>We use access controls and hosted security measures designed to protect the beta. No online service can promise absolute security. Never upload broker passwords, payment-card details or credentials that could permit trading or withdrawals.</p>
      </LegalSection>

      <LegalSection title="5. Optional wearable information">
        <p>Wearable tracking is off by default. During setup, you can choose whether to add HRV and Sleep Debt fields to Check-in. If you do not enable it, those fields remain hidden and Libertrade does not ask you for those readings.</p>
        <p>You can withdraw this consent in Settings at any time. Turning wearable tracking off hides the fields and stops future collection. To request deletion of previously entered wearable readings, email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.</p>
      </LegalSection>

      <LegalSection title="6. Your choices and rights">
        <p>Depending on where you live, you may have rights to access, correct, delete, restrict, object to, or receive a copy of your information. Data exports are available by request rather than through an in-app button.</p>
        <p>Email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> for an access, export or deletion request. We may need to verify that the account belongs to you. You may also complain to the relevant data protection authority where you live, including the UK Information Commissioner&apos;s Office if you are in the UK.</p>
      </LegalSection>

      <LegalSection title="7. Users aged 14–17">
        <p>Libertrade is not available to children under 14. Users aged 14–17 receive the same privacy rights and should avoid entering unnecessary identifying information in free-text journals. Where local law requires permission from a parent or guardian, that permission must be obtained before using the service.</p>
      </LegalSection>

      <LegalSection title="8. Changes and contact">
        <p>We may update this notice as the beta changes. Material changes will be presented in the product or sent to the account email where appropriate. Questions can be sent to <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
