import Link from "next/link";
import BrandWordmark from "./BrandWordmark";
import LandingWorkflowCarousel from "./LandingWorkflowCarousel";

const FEATURES = [
  {
    title: "Daily workflow",
    body: "A guided loop from pre-market through post-session review — not a blank spreadsheet.",
  },
  {
    title: "History & streaks",
    body: "See recent sessions, process streaks, and replay what you logged on any day.",
  },
  {
    title: "Weekly review",
    body: "Step back from the tape and evaluate patterns across the week.",
  },
  {
    title: "Analytics",
    body: "Track P&L, setup performance, and adherence against your own playbook.",
  },
  {
    title: "Prop economics",
    body: "Model drawdown, recovery, and account math alongside your journal.",
  },
  {
    title: "Your process",
    body: "Keep rules, risk limits, and playbook notes where you actually trade from.",
  },
];

function SectionLabel({ children }) {
  return (
    <div className="landing-section-label">
      <span className="landing-section-label-flare" aria-hidden="true" />
      <span className="landing-section-label-text">{children}</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-page-vignette" aria-hidden="true" />
      <div className="landing-page-glow" aria-hidden="true" />

      <header className="landing-header">
        <Link href="/" className="landing-header-brand" aria-label="Libertrade Loop home">
          <BrandWordmark size="compact" />
        </Link>
        <nav className="landing-header-nav" aria-label="Account">
          <Link href="/login" className="landing-link landing-link--muted">
            Sign in
          </Link>
          <Link href="/signup" className="landing-btn landing-btn--primary">
            Get started
          </Link>
        </nav>
      </header>

      <div className="landing-page-inner">
        <main className="landing-main">
          <section className="landing-hero" aria-labelledby="landing-hero-title">
            <p className="landing-hero-eyebrow">Trading journal</p>
            <h1 id="landing-hero-title" className="landing-hero-title">
              Prepare. Trade your plan.
              <span className="landing-hero-title-accent"> Close the loop.</span>
            </h1>
            <p className="landing-hero-lead">
              A trading loop for preparation, execution, risk, and review — built for
              discretionary traders who want structure before the open and honest review after the close.
            </p>
            <div className="landing-hero-actions">
              <Link href="/signup" className="landing-btn landing-btn--primary landing-btn--lg">
                Start free
              </Link>
              <Link href="/login" className="landing-btn landing-btn--outline landing-btn--lg">
                Sign in
              </Link>
            </div>
          </section>

          <section className="landing-section landing-section--loop" aria-labelledby="landing-workflow-title">
            <SectionLabel>The loop</SectionLabel>
            <h2 id="landing-workflow-title" className="landing-section-title">
              Three steps, every session
            </h2>
            <LandingWorkflowCarousel />
          </section>

          <section className="landing-section" aria-labelledby="landing-features-title">
            <SectionLabel>Built for the desk</SectionLabel>
            <h2 id="landing-features-title" className="landing-section-title">
              Everything in one place
            </h2>
            <ul className="landing-features">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="landing-glass-card landing-feature-card">
                  <h3 className="landing-card-title">{feature.title}</h3>
                  <p className="landing-card-body">{feature.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="landing-cta">
            <div className="landing-cta-inner landing-glass-card">
              <SectionLabel>Get started</SectionLabel>
              <h2 className="landing-section-title landing-cta-title">
                Run your next session with intent
              </h2>
              <p className="landing-cta-lead">
                Create an account, set your process once, and come back every trading day.
              </p>
              <Link href="/signup" className="landing-btn landing-btn--primary landing-btn--lg">
                Create account
              </Link>
            </div>
          </section>
        </main>

        <footer className="landing-footer">
          <BrandWordmark size="compact" />
          <p className="landing-footer-note">Session journal for discretionary traders.</p>
        </footer>
      </div>
    </div>
  );
}
