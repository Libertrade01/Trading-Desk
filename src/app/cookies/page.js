import LegalPage, { LegalSection } from "@/components/LegalPage";
import { PRIVACY_EMAIL, PRIVACY_VERSION } from "@/lib/legal";

export const metadata = { title: "Cookie Notice | Libertrade", description: "How Libertrade uses cookies and similar storage." };

export default function CookiePage() {
  return (
    <LegalPage eyebrow="PRIVACY / COOKIES" title="Only what the product needs." intro="This notice explains the cookies and similar browser storage used by the Libertrade beta." effective={PRIVACY_VERSION}>
      <LegalSection title="Essential storage">
        <p>Libertrade uses essential cookies and browser storage to keep you signed in, protect authentication flows, remember security-related state and preserve settings needed for the service to function. These cannot be switched off through a consent banner because the requested service cannot operate reliably without them.</p>
      </LegalSection>
      <LegalSection title="Analytics">
        <p>Libertrade uses Vercel Web Analytics on public pages to understand aggregate visits, page views, referrers, general location, browser and device type. It does not use analytics cookies or build a persistent profile across different days or websites. Analytics are not loaded inside authenticated journal and account pages.</p>
        <p>We do not send names, email addresses, trading records, journal text or account identifiers as analytics events. Libertrade does not use advertising trackers.</p>
      </LegalSection>
      <LegalSection title="Your controls">
        <p>You can remove stored cookies through your browser. Removing essential authentication storage may sign you out or reset product preferences. Questions can be sent to <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.</p>
      </LegalSection>
    </LegalPage>
  );
}
