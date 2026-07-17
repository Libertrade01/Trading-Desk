import LandingRedesignPreview from "./landing-redesign/page";

export const metadata = {
  title: "Libertrade LOOP | Check in, trade your plan, close the LOOP",
  description:
    "A process-first trading journal for discretionary futures traders. Prepare for the session, protect your risk, and review the decisions behind your results.",
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Libertrade LOOP',
  alternateName: 'LOOP',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  url: 'https://libertrade.app',
  description: 'A process-first trading journal for discretionary futures traders.',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'GBP',
    description: 'Free during beta',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Libertrade',
    url: 'https://libertrade.app',
  },
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingRedesignPreview />
    </>
  );
}
