import Link from "next/link";
import SessionPlanCarousel from "./SessionPlanCarousel";
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
    <div className={`${styles.productWindow} ${styles.checkInWindow}`} aria-label="Check-in product preview">
      <div className={styles.windowBar}><i /><i /><i /><span>Monday, July 13</span></div>
      <div className={`${styles.mockBody} ${styles.checkInBody}`}>
        <div className={styles.checkInHeading}>
          <div>
            <p className={styles.mockLabel}>CHECK-IN</p>
            <h3>Rate your readiness.</h3>
            <p className={styles.mockIntro}>Know your state before you risk your capital.</p>
          </div>
          <span>1 OF 4</span>
        </div>

        <div className={styles.checkInTabs} aria-hidden="true">
          <span className={styles.activeTab}>Body</span><span>Mind</span><span>External</span><span>Prep</span>
        </div>

        <div className={styles.checkInGrid}>
          <div className={styles.assessmentCard}>
            <div className={styles.assessmentHead}>
              <div><strong>Body</strong><small>Fuel and recovery for the session.</small></div>
              <span>01 / 04</span>
            </div>

            <div className={styles.fieldRow}>
              <div><label>SLEEP</label><p><b>8.5</b><span>hrs</span></p></div>
              <div><label>SLEEP DEBT</label><p><b>0</b><span>min</span></p></div>
            </div>

            <div className={styles.checkInMetrics}>
              <Metric label="SLEEP RECOVERY" value="9" width="88%" />
              <Metric label="ENERGY" value="7" width="68%" />
            </div>

            <div className={styles.recoveryField}>
              <label>RECOVERY (HRV)</label>
              <p><b>74</b><span>%</span></p>
            </div>

            <div className={styles.habits}>
              <span><i>✓</i> Hydrated</span><span><i>✓</i> Movement</span><span><i /> Breathwork</span>
            </div>
          </div>

          <aside className={styles.readinessCard}>
            <p>READINESS</p>
            <div><strong>76</strong><span>/100</span></div>
            <i><em /></i>
            <b>Ready to trade</b>
            <small>Proceed with your plan.</small>
            <ul>
              <li className={styles.readinessActive}><span>Body</span><b>80</b></li>
              <li><span>Mind</span><b>—</b></li>
              <li><span>External</span><b>—</b></li>
              <li><span>Prep</span><b>—</b></li>
            </ul>
          </aside>
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
  if (kind === "plan") return <SessionPlanCarousel />;
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
