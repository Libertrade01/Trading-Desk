import Link from "next/link";
import PublicConversionLink from "../../components/PublicConversionLink";
import { PUBLIC_CONVERSION_EVENTS } from "../../lib/public-analytics";
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
    title: "Know your state before you risk capital.",
    body: "Check your energy, recovery, and mindset before the session. Libertrade LOOP turns that check-in into a readiness score and highlights when conditions call for greater caution.",
    proof: "Readiness before risk",
    kind: "checkin",
  },
  {
    number: "02",
    eyebrow: "Before execution",
    title: "Make the decisions before the pressure arrives.",
    body: "Define your market thesis, key levels, valid setups, and risk limits before the session begins. Keep the plan visible when the market starts moving.",
    proof: "Your risk, already decided",
    kind: "plan",
  },
  {
    number: "03",
    eyebrow: "After the session",
    title: "Review the process, not just the P&L.",
    body: "Import your trades, record whether you followed the plan, and examine the decisions behind the result. Finish with one clear lesson to carry into the next session.",
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
              <li><span>Mind</span><b>·</b></li>
              <li><span>External</span><b>·</b></li>
              <li><span>Prep</span><b>·</b></li>
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

function IntelligenceVisual() {
  return (
    <div className={styles.intelligenceVisual} aria-label="LOOP Intelligence product preview">
      <div className={styles.intelligenceBar}>
        <div>
          <span>PROCESS INTELLIGENCE</span>
          <strong>Ask your trading data.</strong>
        </div>
        <div className={styles.intelligenceAccount}>
          <div className={styles.intelligenceStatus}><i /> ChatGPT connected</div>
          <button type="button" tabIndex="-1">Log out</button>
        </div>
      </div>

      <div className={styles.intelligenceBody}>
        <div className={styles.intelligenceWorkspace}>
          <div className={styles.intelligenceWelcome}>
            <div className={styles.intelligenceOrb}><i /></div>
            <span>YOUR PROCESS, IN CONTEXT</span>
            <h4>What do you want<br />to understand?</h4>
            <p>Ask about a session, compare patterns across weeks, or turn your journal into a specific next action.</p>
          </div>
          <div className={styles.intelligenceComposer}>
            <span>Ask a question about your process...</span>
            <div>
              <small>Relevant account data is added automatically</small>
              <button type="button" tabIndex="-1">Ask assistant <b>{"\u2197"}</b></button>
            </div>
          </div>
        </div>

        <aside className={styles.intelligenceRail}>
          <div className={styles.intelligencePrompts}>
            <div className={styles.intelligenceRailHead}><span>START WITH A QUESTION</span><b>04 PROMPTS</b></div>
            <div className={styles.intelligencePrompt}><span>01 &nbsp; READINESS</span><strong>Compare my readiness with my best sessions.</strong><b>{"\u2197"}</b></div>
            <div className={styles.intelligencePrompt}><span>02 &nbsp; EXECUTION</span><strong>Where am I breaking my written plan most often?</strong><b>{"\u2197"}</b></div>
            <div className={styles.intelligencePrompt}><span>03 &nbsp; PLAYBOOK</span><strong>Which setups produce my strongest expectancy?</strong><b>{"\u2197"}</b></div>
            <div className={styles.intelligencePrompt}><span>04 &nbsp; REVIEW</span><strong>Turn my journal history into next week&apos;s priorities.</strong><b>{"\u2197"}</b></div>
          </div>

          <div className={styles.intelligenceSources}>
            <div className={styles.intelligenceSourcesHead}><span>DATA AVAILABLE</span><b>LIVE</b></div>
            <div className={styles.intelligenceSourceGrid}>
              <div><span>Trades</span><strong>637</strong><small>Tagged outcomes</small></div>
              <div><span>Check-ins</span><strong>29</strong><small>Readiness history</small></div>
              <div><span>Plans</span><strong>19</strong><small>Rules and setups</small></div>
              <div><span>Journals</span><strong>21</strong><small>Lessons and flags</small></div>
            </div>
          </div>
        </aside>
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
          <PublicConversionLink eventName={PUBLIC_CONVERSION_EVENTS.loginClicked} className={styles.navSignIn} href="/login">Sign in</PublicConversionLink>
        </nav>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>A process-first trading journal</p>
          <h1 id="landing-hero-title"><span>Check in.</span><span>Trade your plan.</span><span>Close the LOOP.</span></h1>
          <p className={styles.heroLead}>A process-first trading journal for discretionary futures traders. Prepare for the session, protect your risk, and review the decisions behind your results.</p>
          <div className={styles.heroActions}>
            <PublicConversionLink eventName={PUBLIC_CONVERSION_EVENTS.landingSignupClicked} className={styles.primaryAction} href="/signup">Set up your LOOP <span>↗</span></PublicConversionLink>
            <PublicConversionLink eventName={PUBLIC_CONVERSION_EVENTS.loginClicked} className={styles.textAction} href="/login">Sign in <span>→</span></PublicConversionLink>
          </div>
          <p className={styles.heroNote}>Free during beta. Import from your broker or enter trades manually.</p>
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
          <h2>Every session becomes evidence.<br />See what changes when you follow the process.</h2>
        </section>

        <section className={styles.features} aria-labelledby="features-title">
          <header className={styles.featuresHead}>
            <div><p>Beyond the LOOP</p><h2 id="features-title">Process over<br /><span>profits.</span></h2></div>
            <p>Performance means more when you connect the outcome to readiness, preparation, and execution, not just profits.</p>
          </header>

          <article className={styles.statsFeature}>
            <div className={styles.featureCopy}>
              <span>STATS / 01</span>
              <h3>Understand what is driving your results.</h3>
              <p>Look beyond headline P&amp;L. Compare performance with readiness, setup selection, risk-plan adherence, and the process decisions recorded during each session.</p>
              <ul className={styles.featureBenefits}>
                <li>Performance by setup and session</li>
                <li>Win rate, expectancy, and R-multiple</li>
                <li>Readiness and process trends over time</li>
                <li>Broker trade imports</li>
              </ul>
            </div>
            <StatsVisual />
          </article>

          <article className={styles.intelligenceFeature}>
            <div className={styles.featureCopy}>
              <span>LOOP INTELLIGENCE / 02</span>
              <h3>Find the leaks. Strengthen the process.</h3>
              <p>Use AI to connect the evidence across your trades, readiness, plans, and journals, powered through your own ChatGPT subscription.</p>
              <ul className={styles.intelligenceBenefits}>
                <li>Surface recurring execution leaks</li>
                <li>Connect readiness to performance</li>
                <li>Turn patterns into your next focus</li>
              </ul>
            </div>
            <IntelligenceVisual />
          </article>

          <div className={styles.featureSplit}>
            <article className={styles.weeklyFeature}>
              <div className={styles.featureCopy}>
                <span>WEEKLY REVIEW / 03</span>
                <h3>Turn a week of trading into one clear focus.</h3>
                <p>Compare the week with the one before it, identify repeated strengths and mistakes, and choose the behaviour that deserves your attention next week.</p>
                <ul className={styles.featureBenefits}>
                  <li>A weekly process scorecard</li>
                  <li>Repeated strengths and mistakes</li>
                  <li>Progress against your chosen focus</li>
                  <li>One priority for the week ahead</li>
                </ul>
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
                <span>PROP TRACKER / 04</span>
                <h3>Know what prop trading is really paying you.</h3>
                <p>Track evaluation fees, resets, and payouts across prop firms. See your true net position before paying for another challenge.</p>
                <ul className={styles.featureBenefits}>
                  <li>Evaluation fees and reset costs</li>
                  <li>Payouts recorded by prop firm</li>
                  <li>Your overall net prop position</li>
                </ul>
              </div>
              <div className={styles.propSnapshot} aria-label="Prop profits product preview">
                <div className={styles.propSnapshotHead}>
                  <div><span>NET POSITION</span><strong>+$2,540</strong></div>
                  <b>IN PROFIT</b>
                </div>

                <div className={styles.propSnapshotKpis}>
                  <div><span>TOTAL PAYOUTS</span><strong>$3,000</strong><small>3 payouts</small></div>
                  <div><span>TOTAL COSTS</span><strong>$460</strong><small>4 evaluations · 2 resets</small></div>
                </div>

                <div className={styles.propFlow}>
                  <div><span>PAYOUTS VERSUS SPEND</span></div>
                  <svg viewBox="0 0 360 115" preserveAspectRatio="none" aria-hidden="true">
                    <defs><linearGradient id="prop-payout-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#268eea" stopOpacity=".28" /><stop offset="1" stopColor="#268eea" stopOpacity="0" /></linearGradient></defs>
                    <path d="M0 98 C48 96 67 78 110 73 S167 62 205 48 S265 40 300 25 S337 18 360 12 V112 H0Z" fill="url(#prop-payout-fill)" />
                    <path d="M0 98 C48 96 67 78 110 73 S167 62 205 48 S265 40 300 25 S337 18 360 12" fill="none" stroke="#4ca3ef" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M0 105 C70 104 110 101 158 100 S255 95 360 92" fill="none" stroke="#ff7970" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <div className={styles.propLegend}><span><i /> Payouts $3,000</span><span><i /> Costs $460</span></div>
                </div>
              </div>
            </article>
          </div>
        </section>

      </main>

      <footer className={styles.footerHorizon}>
        <div className={styles.footerOrbit} aria-hidden="true"><i /><i /></div>
        <div className={styles.footerTop}>
          <Wordmark compact />
          <PublicConversionLink eventName={PUBLIC_CONVERSION_EVENTS.landingSignupClicked} className={styles.footerCta} href="/signup">Set up your LOOP <span>↗</span></PublicConversionLink>
        </div>
        <div className={styles.footerStatement}>
          <span>REVIEW. REFINE. REPEAT.</span>
          <h2>Every session<br />sharpens the next.</h2>
        </div>
        <div className={styles.footerBase}>
          <p className={styles.footerPurpose}>Trading journal and educational review tools.<br />No trade signals or personalised investment recommendations.</p>
          <span>© 2026 LIBERTRADE</span>
          <nav className={styles.footerLegal} aria-label="Legal and account links">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/cookies">Cookies</Link>
            <PublicConversionLink eventName={PUBLIC_CONVERSION_EVENTS.loginClicked} href="/login">Sign in</PublicConversionLink>
          </nav>
        </div>
      </footer>
    </div>
  );
}
