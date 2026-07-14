import LegalPage, { LegalNotice, LegalSection } from "@/components/LegalPage";
import { LEGAL_OPERATOR, PRIVACY_EMAIL, TERMS_VERSION, TRADING_NAME } from "@/lib/legal";

export const metadata = { title: "Beta Terms | Libertrade", description: "Terms for using the Libertrade beta." };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="BETA / TERMS" title="The rules of the loop." intro="These terms govern access to the Libertrade beta. Please read them before creating an account." effective={TERMS_VERSION}>
      <LegalNotice>Libertrade is operated by <strong>{LEGAL_OPERATOR}, trading as {TRADING_NAME}</strong>. Contact: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.</LegalNotice>

      <LegalSection title="1. The beta service">
        <p>Libertrade is beta software and is currently provided without charge. Features may be incomplete, changed, interrupted or removed. We may impose reasonable limits, pause registrations, or end the beta. We will try to give reasonable notice where practical, but continuous availability is not guaranteed.</p>
      </LegalSection>

      <LegalSection title="2. Eligibility and accounts">
        <p>You must be at least 14 and legally permitted to use the service where you live. If local law requires parental or guardian permission, you must have that permission. Account information must be accurate, and you are responsible for protecting your password and activity under your account.</p>
        <p>One person may not impersonate another, evade security controls, probe the service for vulnerabilities, or use Libertrade in a way that harms the service or another person.</p>
      </LegalSection>

      <LegalSection title="3. A journal, not investment advice">
        <p>Libertrade provides trading-journal, process-analytics and educational review tools. It does not provide trade signals, personalised investment recommendations, brokerage, execution, account management or access to customer funds.</p>
        <p>Trading involves substantial risk. Information, statistics and AI-generated observations may be incomplete or wrong and must not be treated as a recommendation to buy, sell or hold a financial instrument. You remain responsible for every trading and risk decision.</p>
      </LegalSection>

      <LegalSection title="4. Your content and data">
        <p>You retain ownership of the trading records, notes and other content you submit. You give us a limited permission to host, process, reproduce and transform that content only as needed to operate, secure and improve the service and provide features you request.</p>
        <p>You must have the right to upload the content. Do not upload broker passwords, live execution credentials, payment information, unlawfully obtained data or another person’s confidential information.</p>
      </LegalSection>

      <LegalSection title="5. AI features">
        <p>AI output is generated from patterns and may contain errors. Review it critically. It is intended to help reflect on historical behaviour and process, not to decide what or when you should trade. Do not rely on AI output for financial, legal, medical or other professional decisions.</p>
      </LegalSection>

      <LegalSection title="6. Libertrade materials">
        <p>The software, interface, branding and material supplied by Libertrade remain owned by the operator or applicable licensors. You receive a personal, limited, non-exclusive and revocable right to use the beta. You may not copy, resell, reverse engineer or commercially exploit it except where applicable law expressly permits.</p>
      </LegalSection>

      <LegalSection title="7. Suspension and deletion">
        <p>We may suspend or terminate an account that threatens security, breaks these terms, creates legal risk or harms other users. You may request account deletion at any time by emailing <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. We recommend requesting an export first if you want to retain your data.</p>
      </LegalSection>

      <LegalSection title="8. Responsibility for the beta">
        <p>The beta is supplied on an “as available” basis. To the fullest extent allowed by applicable law, we are not responsible for trading losses, lost profits, lost opportunities, corrupted imports, unavailable features or indirect losses arising from use of the beta. Nothing in these terms excludes responsibility that cannot legally be excluded.</p>
      </LegalSection>

      <LegalSection title="9. Changes">
        <p>We may revise these terms as Libertrade develops. If a change materially affects your rights, we will provide reasonable notice and may ask you to accept the new version before continuing.</p>
      </LegalSection>
    </LegalPage>
  );
}
