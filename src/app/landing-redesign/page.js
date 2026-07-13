import Link from "next/link";
import SessionPlanCarousel from "./SessionPlanCarousel";
import CloseLoopCarousel from "./CloseLoopCarousel";
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
    title: "Rate your state before you trade.",
    body: "Build your readiness score from Body, Mind, and External. Then tick off your final checks before the open.",
    proof: "Clarity before execution",
    kind: "checkin",
  },
  {
    number: "02",
    eyebrow: "During the session",
    title: "Set the plan before you execute.",
    body: "Mark your levels, pick your setups, lock in risk limits, and define your focus before the open.",
    proof: "Your risk, already decided",
    kind: "plan",
  },
  {
    number: "03",
    eyebrow: "After the session",
    title: "Close the loop and refine the process.",
    body: "Import and tag your trades. Score process adherence. Walk away with one lesson to take into tomorrow.",
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
  return <CloseLoopCarousel />;
}

function StageMockup({ kind }) {
  if (kind === "checkin") return <CheckInMockup />;
  if (kind === "plan") return <SessionPlanCarousel />;
  return <ReviewMockup />;
}

function StatsVisual() {
  return (
    <div className={styles.statsVisual} aria-label="Stats performance preview">
      <div className={styles.statsKpis}>
        <div><span>NET P&amp;L</span><strong>+$4,210</strong><small>132 trades</small></div>
        <div><span>WIN RATE</span><strong>54.7%</strong><small>70W · 58L · 4BE</small></div>
        <div><span>EXPECTANCY</span><strong>+$31.89</strong><small>per trade</small></div>
        <div><span>PROFIT FACTOR</span><strong>1.74</strong><small>healthy edge</small></div>
        <div className={styles.outcomesKpi}><span>OUTCOMES</span><strong>70 / 58</strong><small><i /> wins <i /> losses</small></div>
      </div>

      <div className={styles.statsMain}>
        <section className={styles.performanceScore}>
          <span>PERFORMANCE SCORE</span>
          <div className={styles.scoreGauge}><strong>82</strong><small>/100</small></div>
          <b>Process holding</b>
          <p>Consistency <strong>78%</strong></p>
        </section>

        <section className={styles.equityPanel}>
          <header><span>EQUITY CURVE</span><b>CUMULATIVE P&amp;L</b></header>
          <div className={styles.equityChart}>
            <svg viewBox="0 0 760 230" preserveAspectRatio="none" aria-hidden="true">
              <defs><linearGradient id="stats-equity-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2789df" stopOpacity=".34" /><stop offset="1" stopColor="#2789df" stopOpacity="0" /></linearGradient></defs>
              <path d="M0 207 C42 196 72 176 112 169 S178 139 222 148 S286 111 330 119 S390 83 434 91 S489 55 531 69 S587 68 628 50 S694 42 760 28 V230 H0Z" fill="url(#stats-equity-fill)" />
              <path d="M0 207 C42 196 72 176 112 169 S178 139 222 148 S286 111 330 119 S390 83 434 91 S489 55 531 69 S587 68 628 50 S694 42 760 28" fill="none" stroke="#4ca3ef" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className={styles.equityValue}>+$4,210</span>
          </div>
        </section>
      </div>

      <div className={styles.statsLower}>
        <section className={styles.dailyPanel}>
          <header><span>DAILY P&amp;L</span></header>
          <div className={styles.dailyBars} aria-label="Mixed profitable and losing sessions">
            <i /><i /><i className={styles.lossBar} /><i /><i /><i /><i className={styles.lossBar} /><i /><i /><i className={styles.lossBar} /><i /><i /><i /><i className={styles.lossBar} /><i /><i />
          </div>
        </section>

        <section className={styles.timePanel}>
          <header><span>PERFORMANCE BY TIME</span><b>AVG P&amp;L</b></header>
          <div className={styles.timeBars}>
            <div><i /><span>9:30</span></div><div><i /><span>10:00</span></div><div className={styles.timeLoss}><i /><span>10:30</span></div><div><i /><span>11:00</span></div><div><i /><span>11:30</span></div>
          </div>
        </section>
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
          <p className={styles.heroEyebrow}>A process loop for discretionary traders</p>
          <h1 id="landing-hero-title"><span>Check-in.</span><span>Trade your plan.</span><span>Close the loop.</span></h1>
          <p className={styles.heroLead}>Prepare before the open. Execute against written rules. Review to refine your process.</p>
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
            <p>Your trading day</p>
            <h2 id="workflow-title">A repeatable process<br />from check-in to review.</h2>
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
          <p>REVIEW. REFINE. REPEAT.</p>
          <h2>The loop compounds.<br />Each review sharpens the next session.</h2>
        </section>

        <section className={styles.features} aria-labelledby="features-title">
          <header className={styles.featuresHead}>
            <div><p>Beyond the loop</p><h2 id="features-title">Process over<br /><span>profits.</span></h2></div>
            <p>Performance means more when you connect the outcome to readiness, preparation, and execution, not just profits.</p>
          </header>

          <article className={styles.statsFeature}>
            <div className={styles.featureCopy}>
              <span>STATS / 01</span>
              <h3>Know what is actually driving your results.</h3>
              <p>Connect performance to setup quality, session type, risk, and playbook adherence.</p>
            </div>
            <StatsVisual />
          </article>

          <div className={styles.featureSplit}>
            <article className={styles.weeklyFeature}>
              <div className={styles.featureCopy}>
                <span>WEEKLY REVIEW / 02</span>
                <h3>The trading week<br />scored in one place.</h3>
                <p>Compare this week to last, spot the patterns, and refine next week with two clear focuses.</p>
              </div>
              <div className={styles.weeklySnapshot} aria-label="Weekly Review product preview">
                <div className={styles.weeklySnapshotBar}>
                  <div><span>JUL 06–10</span><strong>WEEKLY REVIEW.</strong></div>
                  <b>COMPLETE</b>
                </div>

                <div className={styles.weeklyOneLine}>
                  <span>WEEK IN ONE LINE</span>
                  <p>Patient execution. Risk stayed controlled when momentum faded.</p>
                </div>

                <div className={styles.weeklyMetrics}>
                  <div><span>AVG READINESS</span><strong>76</strong><small className={styles.positiveChange}>+3 vs last week</small></div>
                  <div><span>PLAYBOOK</span><strong>64%</strong><small className={styles.negativeChange}>−8 pts vs last week</small></div>
                  <div><span>RISK PLAN</span><strong>4/5</strong><small>Same as last week</small></div>
                </div>

                <div className={styles.weeklyComparison}>
                  <div className={styles.weeklyComparisonHead}><span>METRIC</span><span>THIS WEEK</span><span>PRIOR</span><span>CHANGE</span></div>
                  <div><strong>Avg readiness</strong><span>76</span><span>73</span><b className={styles.positiveChange}>+3</b></div>
                  <div><strong>Playbook</strong><span>64%</span><span>72%</span><b className={styles.negativeChange}>−8 pts</b></div>
                  <div><strong>Risk plan</strong><span>4/5</span><span>4/5</span><b>Same</b></div>
                </div>
              </div>
            </article>

            <article className={styles.propFeature}>
              <div className={styles.featureCopy}>
                <span>PROP TRACKER / 03</span>
                <h3>Know what prop trading is really paying you.</h3>
                <p>Track every evaluation fee and payout to see your true net position across prop firms.</p>
              </div>
              <div className={styles.propSnapshot} aria-label="Prop profits product preview">
                <div className={styles.propSnapshotHead}>
                  <div><span>NET POSITION</span><strong>+$2,620</strong></div>
                  <b>IN PROFIT</b>
                </div>

                <div className={styles.propSnapshotKpis}>
                  <div><span>TOTAL PAYOUTS</span><strong>$3,000</strong><small>3 payouts</small></div>
                  <div><span>TOTAL SPEND</span><strong>$380</strong><small>4 evaluations</small></div>
                </div>

                <div className={styles.propFlow}>
                  <div><span>PAYOUTS VERSUS SPEND</span></div>
                  <svg viewBox="0 0 360 115" preserveAspectRatio="none" aria-hidden="true">
                    <defs><linearGradient id="prop-payout-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#268eea" stopOpacity=".28" /><stop offset="1" stopColor="#268eea" stopOpacity="0" /></linearGradient></defs>
                    <path d="M0 98 C48 96 67 78 110 73 S167 62 205 48 S265 40 300 25 S337 18 360 12 V112 H0Z" fill="url(#prop-payout-fill)" />
                    <path d="M0 98 C48 96 67 78 110 73 S167 62 205 48 S265 40 300 25 S337 18 360 12" fill="none" stroke="#4ca3ef" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M0 105 C70 104 110 101 158 100 S255 95 360 92" fill="none" stroke="#ff7970" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <div className={styles.propLegend}><span><i /> Payouts $3,000</span><span><i /> Spend $380</span></div>
                </div>
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
