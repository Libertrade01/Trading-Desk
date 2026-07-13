import Link from "next/link";
import styles from "./landing-redesign.module.css";

export const metadata = {
  title: "Libertrade LOOP redesign preview",
  description: "Private visual preview of the proposed Libertrade LOOP landing page redesign.",
  robots: { index: false, follow: false },
};

const stages = [
  {
    number: "01",
    eyebrow: "Before the session",
    title: "Know your state before you trade.",
    body: "Score readiness, name the market context, and decide whether you should be taking risk at all.",
    proof: "Clarity before execution",
    kind: "checkin",
  },
  {
    number: "02",
    eyebrow: "During the session",
    title: "Remove decisions from the moment.",
    body: "Write the bias, levels, valid setups, and risk limits before emotion has a vote.",
    proof: "Your risk, already decided",
    kind: "plan",
  },
  {
    number: "03",
    eyebrow: "After the session",
    title: "Turn execution into tomorrow’s edge.",
    body: "Review adherence while the session is fresh and carry one useful lesson into the next open.",
    proof: "Review. Refine. Repeat.",
    kind: "review",
  },
];

function Wordmark({ compact = false }) {
  return (
    <img
      className={compact ? styles.wordmarkCompact : styles.wordmark}
      src="/brand/primary-wordmark-login-v3.png"
      alt="Libertrade LOOP"
    />
  );
}

function CheckInMockup() {
  return (
    <div className={styles.productWindow} aria-label="Check-in product preview">
      <div className={styles.windowBar}><i /><i /><i /><span>Wednesday, July 3</span></div>
      <div className={styles.mockBody}>
        <p className={styles.mockLabel}>CHECK-IN</p>
        <h3>How ready are you to trade?</h3>
        <p className={styles.mockIntro}>Be honest before the open. Your score updates as you go.</p>
        <div className={styles.scoreRow}>
          <div className={styles.scoreRing}><strong>78</strong><span>READY</span></div>
          <div className={styles.sliderStack}>
            <Metric label="ENERGY" value="8" width="82%" />
            <Metric label="FOCUS" value="7" width="71%" />
            <Metric label="DISCIPLINE" value="8" width="79%" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, width }) {
  return (
    <div className={styles.metric}>
      <div><span>{label}</span><b>{value}</b></div>
      <i><em style={{ width }} /></i>
    </div>
  );
}

function PlanMockup() {
  return (
    <div className={styles.productWindow} aria-label="Session Plan product preview">
      <div className={styles.windowBar}><i /><i /><i /><span>SESSION PLAN</span></div>
      <div className={styles.mockBody}>
        <p className={styles.mockLabel}>YOUR PLAN</p>
        <h3>Trade what you prepared.</h3>
        <div className={styles.planGrid}>
          <div><span>BIAS</span><strong>Bullish above VWAP</strong></div>
          <div><span>MAX RISK</span><strong>0.75R</strong></div>
          <div className={styles.planWide}><span>PRIMARY SETUP</span><strong>Opening drive after confirmation</strong></div>
          <div><span>INVALIDATION</span><strong>Below 5,418.25</strong></div>
          <div><span>TARGET</span><strong>5,432.50</strong></div>
        </div>
      </div>
    </div>
  );
}

function ReviewMockup() {
  return (
    <div className={styles.productWindow} aria-label="Close the LOOP product preview">
      <div className={styles.windowBar}><i /><i /><i /><span>CLOSE THE LOOP</span></div>
      <div className={styles.mockBody}>
        <div className={styles.reviewHead}>
          <div><p className={styles.mockLabel}>SESSION REVIEW</p><h3>Did you trade the plan?</h3></div>
          <strong>+1.35R</strong>
        </div>
        <div className={styles.reviewGrid}>
          <div><span>EXECUTION</span><b>8.2</b><small>Strong process</small></div>
          <div><span>PLAYBOOK</span><b>4 / 5</b><small>One impulsive add</small></div>
          <blockquote>“Waited for confirmation. Protected risk. No chase after the first move.”</blockquote>
        </div>
      </div>
    </div>
  );
}

function StageMockup({ kind }) {
  if (kind === "checkin") return <CheckInMockup />;
  if (kind === "plan") return <PlanMockup />;
  return <ReviewMockup />;
}

function AnalyticsVisual() {
  return (
    <div className={styles.analyticsVisual} aria-label="Analytics performance preview">
      <div className={styles.analyticsTop}>
        <div><span>NET P&amp;L</span><strong>+$8,420</strong><small>+12.4%</small></div>
        <div><span>EXPECTANCY</span><strong>1.42R</strong><small>+0.18R</small></div>
        <div><span>WIN RATE</span><strong>64%</strong><small>28 trades</small></div>
      </div>
      <div className={styles.chart}>
        <svg viewBox="0 0 720 230" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="preview-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#0065bd" stopOpacity=".3" /><stop offset="1" stopColor="#0065bd" stopOpacity="0" /></linearGradient></defs>
          <path d="M0 205 C60 194 78 164 128 173 S210 126 254 143 S335 88 390 108 S470 67 514 82 S612 33 720 48 V230 H0Z" fill="url(#preview-chart-fill)" />
          <path d="M0 205 C60 194 78 164 128 173 S210 126 254 143 S335 88 390 108 S470 67 514 82 S612 33 720 48" fill="none" stroke="#4ca3ef" strokeWidth="3" />
        </svg>
      </div>
    </div>
  );
}

export default function LandingRedesignPreview() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#preview-main">Skip to content</a>
      <header className={styles.hero}>
        <img className={styles.heroLoop} src="/brand/landing-loop-clean.png" alt="" aria-hidden="true" />
        <div className={styles.heroShade} aria-hidden="true" />
        <nav className={styles.heroNav} aria-label="Account">
          <Link href="/" aria-label="Libertrade LOOP home"><Wordmark /></Link>
          <Link className={styles.navSignIn} href="/login">Sign in</Link>
        </nav>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>A process for discretionary traders</p>
          <h1 id="landing-hero-title"><span>Check-in.</span><span>Trade your plan.</span><span>Close the loop.</span></h1>
          <p className={styles.heroLead}>Prepare before the open. Execute against written rules. Review while the session is still fresh.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/signup">Set up your LOOP <span>↗</span></Link>
            <Link className={styles.textAction} href="/login">Sign in <span>→</span></Link>
          </div>
        </div>
        <a className={styles.scrollCue} href="#landing-workflow"><span>The LOOP</span><b>↓</b></a>
      </header>

      <main id="preview-main">
        <section id="landing-workflow" className={styles.workflow} aria-labelledby="workflow-title">
          <div className={styles.sectionIntro}>
            <p>YOUR TRADING DAY, CONNECTED</p>
            <h2 id="workflow-title">A repeatable process<br />from open to review.</h2>
          </div>
          <div className={styles.workflowRail} aria-hidden="true"><i /><i /><i /></div>
          {stages.map((stage) => (
            <article id={stage.number === "01" ? "landing-checkin" : undefined} className={styles.stage} key={stage.number}>
              <div className={styles.stageCopy}>
                <span className={styles.stageNumber}>{stage.number}</span>
                <p className={styles.stageEyebrow}>{stage.eyebrow}</p>
                <h2>{stage.title}</h2>
                <p className={styles.stageBody}>{stage.body}</p>
                <div className={styles.stageProof}><i /><span>{stage.proof}</span></div>
              </div>
              <StageMockup kind={stage.kind} />
            </article>
          ))}
        </section>

        <section className={styles.loopStatement} aria-label="The completed trading loop">
          <div className={styles.statementRing} aria-hidden="true" />
          <p>EVERY SESSION BECOMES DATA</p>
          <h2>Every review makes<br />the next session better.</h2>
        </section>

        <section className={styles.features} aria-labelledby="features-title">
          <header className={styles.featuresHead}>
            <div><p>BEYOND THE JOURNAL</p><h2 id="features-title">See the process.<br /><span>Then improve it.</span></h2></div>
            <p>Performance means more when you can connect the outcome to readiness, preparation, and execution.</p>
          </header>

          <article className={styles.analyticsFeature}>
            <div className={styles.featureCopy}>
              <span>ANALYTICS / 01</span>
              <h3>Know what is actually driving your results.</h3>
              <p>Connect P&amp;L to setup quality, session type, risk, and playbook adherence.</p>
            </div>
            <AnalyticsVisual />
          </article>

          <div className={styles.featureSplit}>
            <article className={styles.weeklyFeature}>
              <div className={styles.featureCopy}>
                <span>WEEKLY REVIEW / 02</span>
                <h3>Seven days.<br />One clear lesson.</h3>
                <p>Step back from individual trades and choose one improvement for the week ahead.</p>
              </div>
              <div className={styles.weeklyScore}>
                <div><span>WEEK 27</span><strong>82</strong><small>PROCESS SCORE</small></div>
                <blockquote>“Protected risk on four of five sessions. Next focus: no impulsive adds.”</blockquote>
              </div>
            </article>

            <article className={styles.propFeature}>
              <div className={styles.featureCopy}>
                <span>PROP TRACKER / 03</span>
                <h3>Know the room you have left.</h3>
                <p>Keep the target, drawdown, and required trading days visible beside the process protecting the account.</p>
              </div>
              <div className={styles.propProgress}>
                <div><span>50K EVALUATION</span><b>94.6%</b></div>
                <i><em /></i>
                <div className={styles.propStats}><span>+$2,840</span><span>$1,420 room</span><span>8 / 10 days</span></div>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.finalCta}>
          <div>
            <p>YOUR NEXT SESSION</p>
            <h2>Start before<br />the market opens.</h2>
          </div>
          <div>
            <p>Build the plan. Trade it. Review it. Carry the lesson forward.</p>
            <Link className={styles.primaryAction} href="/signup">Set up your LOOP <span>↗</span></Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <Wordmark compact />
        <p>Session journal for discretionary traders.</p>
        <Link href="/login">Sign in</Link>
      </footer>
    </div>
  );
}
