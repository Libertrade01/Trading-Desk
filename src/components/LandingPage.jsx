import Link from "next/link";
import BrandWordmark from "./BrandWordmark";
import { CheckInPreview, CloseLoopPreview, SessionPlanPreview } from "./LandingWorkflowPreviews";

function SectionLabel({ children }) {
  return <div className="landing-section-label"><span className="landing-section-label-flare" aria-hidden="true" /><span className="landing-section-label-text">{children}</span></div>;
}

function AnalyticsPreview() {
  return <div className="landing-product-ui landing-analytics-ui" aria-label="Analytics dashboard preview">
    <div className="landing-ui-toolbar"><span>Performance overview</span><b>Last 30 days</b></div>
    <div className="landing-metric-row"><div><span>Net P&amp;L</span><strong className="is-positive">+$8,420</strong><small>+12.4%</small></div><div><span>Expectancy</span><strong>1.42R</strong><small>+0.18R</small></div><div><span>Win rate</span><strong>64%</strong><small>28 trades</small></div></div>
    <div className="landing-chart-panel"><div className="landing-chart-grid" aria-hidden="true" /><svg viewBox="0 0 620 180" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="landing-analytics-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#168cff" stopOpacity=".35"/><stop offset="1" stopColor="#168cff" stopOpacity="0"/></linearGradient></defs><path d="M0 160 C45 152 55 125 94 130 S160 95 196 108 S258 68 296 78 S350 48 392 61 S455 31 490 47 S550 18 620 22 V180 H0Z" fill="url(#landing-analytics-fill)"/><path d="M0 160 C45 152 55 125 94 130 S160 95 196 108 S258 68 296 78 S350 48 392 61 S455 31 490 47 S550 18 620 22" fill="none" stroke="#168cff" strokeWidth="3"/></svg><span className="landing-chart-value">+$8,420</span></div>
    <div className="landing-setup-strip"><span>Best setup</span><strong>Opening drive</strong><i>73% win rate</i><em>+4.8R</em></div>
  </div>;
}

function WeeklyReviewPreview() {
  const days = ["M", "T", "W", "T", "F"];
  return <div className="landing-product-ui landing-review-ui" aria-label="Weekly review preview">
    <div className="landing-ui-toolbar"><span>Week 27 review</span><b>June 29 — July 3</b></div>
    <div className="landing-review-score"><div><span>Weekly score</span><strong>82</strong><small>Strong process</small></div><div className="landing-review-ring" /></div>
    <div className="landing-week-days">{days.map((day, index) => <span key={`${day}-${index}`} className={index === 3 ? "is-low" : ""}><b>{day}</b><i style={{height: `${42 + index * 9 - (index === 3 ? 27 : 0)}%`}} /></span>)}</div>
    <div className="landing-review-insights"><div><span>What worked</span><p>Waited for confirmation and protected daily risk.</p></div><div><span>Next week’s focus</span><p>No pullbacks into no-man’s-land. Trade the plan.</p></div></div>
  </div>;
}

function PropPreview() {
  return <div className="landing-product-ui landing-prop-ui" aria-label="Prop challenge tracker preview">
    <div className="landing-ui-toolbar"><span>50K Evaluation</span><b>Active challenge</b></div>
    <div className="landing-prop-balance"><span>Current balance</span><strong>$52,840</strong><small>+$2,840 from start</small></div>
    <div className="landing-prop-progress"><div><span>Profit target</span><b>$2,840 / $3,000</b></div><i><em /></i><small>94.6% complete</small></div>
    <div className="landing-prop-limits"><div><span>Daily loss room</span><strong>$1,420</strong><small>Protected</small></div><div><span>Max drawdown room</span><strong>$2,360</strong><small>Healthy</small></div><div><span>Trading days</span><strong>8 / 10</strong><small>2 remaining</small></div></div>
  </div>;
}

export default function LandingPage() {
  return <div className="landing-page">
    <div className="landing-page-vignette" aria-hidden="true" /><div className="landing-page-glow" aria-hidden="true" />
    <header className="landing-header"><Link href="/" className="landing-header-brand" aria-label="Libertrade Loop home"><img src="/brand/primary-wordmark-login-v3.png" alt="Libertrade Loop" className="landing-header-logo" /></Link><nav className="landing-header-nav" aria-label="Account"><Link href="/login" className="landing-link landing-link--muted">Sign in</Link><Link href="/signup" className="landing-btn landing-btn--primary">Start free</Link></nav></header>
    <div className="landing-page-inner"><main className="landing-main">
      <section className="landing-hero landing-hero--simple landing-hero--artwork" aria-labelledby="landing-hero-title"><img src="/brand/primary-wordmark-login-v3.png" alt="Libertrade Loop" className="landing-artwork-logo" /><h1 id="landing-hero-title" className="landing-artwork-title">Check-in. Trade your plan. Close the loop.</h1><div className="landing-artwork-actions"><Link href="/signup" className="landing-artwork-btn landing-artwork-btn--primary">Build Your Loop</Link><Link href="/login" className="landing-artwork-btn landing-artwork-btn--secondary">Sign in</Link></div></section>

      <section id="landing-workflow" className="landing-workflow-story landing-workflow-cinematic" aria-label="The Libertrade Loop workflow">
        <a href="#landing-checkin" className="landing-workflow-entry-cue"><span>The loop</span><b aria-hidden="true">↓</b></a>
        <div className="landing-workflow-trail" aria-hidden="true"><i /></div>

        <article id="landing-checkin" className="landing-workflow-chapter landing-workflow-chapter--checkin">
          <div className="landing-workflow-chapter-copy"><span className="landing-workflow-number">01</span><SectionLabel>Before the session</SectionLabel><h3>Know your state<br />before you trade.</h3><p>Score your physical state, mindset, and market context before risk enters the equation.</p><div className="landing-workflow-proof"><strong>Readiness first.</strong><span>Clarity before execution.</span></div></div>
          <div className="landing-workflow-screen"><CheckInPreview /></div>
        </article>

        <article className="landing-workflow-chapter landing-workflow-chapter--plan">
          <div className="landing-workflow-chapter-copy"><span className="landing-workflow-number">02</span><SectionLabel>During the session</SectionLabel><h3>Remove decisions<br />from the moment.</h3><p>Define bias, key levels, setups, and risk before emotion has a chance to take control.</p><div className="landing-workflow-proof"><strong>Your plan, visible.</strong><span>Your risk, already decided.</span></div></div>
          <div className="landing-workflow-screen"><SessionPlanPreview /></div>
        </article>

        <article className="landing-workflow-chapter landing-workflow-chapter--close">
          <div className="landing-workflow-chapter-copy"><span className="landing-workflow-number">03</span><SectionLabel>After the session</SectionLabel><h3>Turn today’s execution<br />into tomorrow’s edge.</h3><p>Review adherence and decisions while the session is fresh, then carry one clear lesson forward.</p><div className="landing-workflow-proof"><strong>Review. Refine.</strong><span>Close the loop.</span></div></div>
          <div className="landing-workflow-screen"><CloseLoopPreview /></div>
        </article>
      </section>

      <section className="landing-loop-transition" aria-label="The completed trading loop"><div className="landing-loop-transition-ring" aria-hidden="true"/><p>Every session becomes data.</p><h2>Every review makes the next session better.</h2></section>

      <section className="landing-showcases" aria-label="Libertrade Loop features">
        <article className="landing-showcase landing-showcase--analytics"><div className="landing-showcase-copy"><SectionLabel>Analytics</SectionLabel><h2>See what is actually driving your results.</h2><p>Connect performance to readiness, execution, setup quality, and playbook adherence—not just the final P&amp;L.</p><ul><li>Setup and session performance</li><li>Expectancy, win rate, and R-multiple</li><li>Process trends over time</li></ul></div><AnalyticsPreview /></article>
        <article className="landing-showcase landing-showcase--review"><WeeklyReviewPreview /><div className="landing-showcase-copy"><SectionLabel>Weekly review</SectionLabel><h2>Turn seven days of trading into one clear lesson.</h2><p>Step away from individual trades, identify the patterns that matter, and set one focused improvement for the week ahead.</p><ul><li>Automatic weekly scorecard</li><li>Repeated strengths and mistakes</li><li>A clear focus for next week</li></ul></div></article>
        <article className="landing-showcase landing-showcase--prop"><div className="landing-showcase-copy"><SectionLabel>Prop tracker</SectionLabel><h2>Know exactly where you stand in your challenge.</h2><p>Keep targets, drawdown room, and trading-day requirements visible alongside the process protecting the account.</p><ul><li>Real-time challenge progress</li><li>Daily and maximum loss room</li><li>Recovery and payout planning</li></ul></div><PropPreview /></article>
      </section>

      <section className="landing-cta"><div className="landing-cta-inner landing-glass-card"><SectionLabel>Get started</SectionLabel><h2 className="landing-section-title landing-cta-title">Your next session starts before the market opens.</h2><p className="landing-cta-lead">Build your first plan in minutes. Review it after the close. Improve with every completed loop.</p><Link href="/signup" className="landing-btn landing-btn--primary landing-btn--lg">Start your loop</Link></div></section>
    </main><footer className="landing-footer"><BrandWordmark size="compact"/><p className="landing-footer-note">Session journal for discretionary traders.</p></footer></div>
  </div>;
}
