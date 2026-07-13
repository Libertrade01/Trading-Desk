import Image from "next/image";
import Link from "next/link";
import styles from "./prop-profits-redesign.module.css";

export const metadata = {
  title: "Prop Profits Redesign Preview | Libertrade LOOP",
  robots: { index: false, follow: false },
};

const entries = [
  { date: "Jun 22, 2026", firm: "Lucid", amount: "$94.00" },
  { date: "Jun 21, 2026", firm: "Lucid", amount: "$94.00" },
  { date: "Jun 14, 2026", firm: "Lucid", amount: "$98.00" },
];

function ArrowUpRight() {
  return <span aria-hidden="true">↗</span>;
}

export default function PropProfitsRedesignPreview() {
  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <header className={styles.nav}>
        <Link href="/" className={styles.brand} aria-label="Libertrade LOOP home">
          <Image
            src="/brand/primary-wordmark-login-v3.png"
            alt="Libertrade LOOP"
            width={1810}
            height={685}
            priority
          />
        </Link>
        <div className={styles.previewMark}>
          <span className={styles.previewDot} />
          Design preview
        </div>
        <Link href="/prop-economics" className={styles.currentLink}>
          Current page <ArrowUpRight />
        </Link>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero} aria-labelledby="prop-preview-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>PROP ECONOMICS</p>
            <h1 id="prop-preview-title">
              Prop profits<span>.</span>
            </h1>
            <p className={styles.intro}>
              Track what you paid prop firms versus what you withdrew.
              Know exactly where you stand before the next evaluation.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/prop-economics" className={styles.secondaryAction}>
              Log spend <span>+</span>
            </Link>
            <Link href="/prop-economics" className={styles.primaryAction}>
              Log payout <ArrowUpRight />
            </Link>
          </div>
        </section>

        <section className={styles.positionGrid} aria-label="Capital position overview">
          <article className={styles.netCard}>
            <div className={styles.cardTopline}>
              <p>NET POSITION</p>
              <span className={styles.phasePill}>Pre-payout phase</span>
            </div>
            <div className={styles.netAmount}>−$286.00</div>
            <div className={styles.breakEvenCopy}>
              <span>$286 to break even</span>
              <span>0% recovered</span>
            </div>
            <div className={styles.progressTrack}>
              <span />
            </div>
            <p className={styles.netNote}>
              Your first $286 in payouts clears the cost of your current prop journey.
            </p>
          </article>

          <div className={styles.metricStack}>
            <article className={styles.metricCard}>
              <p>TOTAL PAYOUTS</p>
              <strong>$0.00</strong>
              <span>No payouts logged yet</span>
            </article>
            <article className={styles.metricCard}>
              <p>TOTAL SPEND</p>
              <strong>$286.00</strong>
              <span>Across 3 evaluations</span>
            </article>
          </div>

          <article className={styles.milestoneCard}>
            <p className={styles.eyebrow}>NEXT MILESTONE</p>
            <div className={styles.milestoneIcon}>01</div>
            <h2>First payout.</h2>
            <p>Turn evaluation spend into recovered capital, then move the account into profit.</p>
            <div className={styles.milestoneMeta}>
              <span>Break-even target</span>
              <strong>$286</strong>
            </div>
          </article>
        </section>

        <section className={styles.trendSection} aria-labelledby="trend-heading">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>CAPITAL FLOW</p>
              <h2 id="trend-heading">See the economics clearly.</h2>
              <p>Every fee and payout, mapped against your break-even point.</p>
            </div>
            <div className={styles.legend} aria-label="Chart legend">
              <span><i className={styles.payoutKey} /> Payouts $0</span>
              <span><i className={styles.spendKey} /> Spend $286</span>
            </div>
          </div>

          <div className={styles.chartLayout}>
            <div className={styles.chartCard}>
              <div className={styles.chartScale} aria-hidden="true">
                <span>$300</span><span>$200</span><span>$100</span><span>$0</span>
              </div>
              <svg
                className={styles.chart}
                viewBox="0 0 900 330"
                role="img"
                aria-label="Cumulative spend rose from 98 dollars to 286 dollars while payouts remained at zero"
              >
                <defs>
                  <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ff7268" stopOpacity=".18" />
                    <stop offset="1" stopColor="#ff7268" stopOpacity="0" />
                  </linearGradient>
                  <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <g className={styles.gridLines}>
                  <line x1="22" y1="52" x2="878" y2="52" />
                  <line x1="22" y1="126" x2="878" y2="126" />
                  <line x1="22" y1="200" x2="878" y2="200" />
                  <line x1="22" y1="274" x2="878" y2="274" />
                </g>
                <path d="M22 274 H878" className={styles.payoutLine} />
                <path
                  d="M22 274 L22 202 C100 202 138 202 214 202 L214 132 C310 132 364 132 460 132 L460 62 C590 62 712 62 878 62 L878 274 Z"
                  fill="url(#spendFill)"
                />
                <path
                  d="M22 202 C100 202 138 202 214 202 L214 132 C310 132 364 132 460 132 L460 62 C590 62 712 62 878 62"
                  className={styles.spendLine}
                />
                <g className={styles.chartPoints} filter="url(#lineGlow)">
                  <circle cx="22" cy="202" r="5" />
                  <circle cx="214" cy="132" r="5" />
                  <circle cx="460" cy="62" r="5" />
                </g>
                <g className={styles.chartLabels}>
                  <text x="22" y="317">JUN 14</text>
                  <text x="214" y="317">JUN 21</text>
                  <text x="460" y="317">JUN 22</text>
                  <text x="878" y="317" textAnchor="end">TODAY</text>
                </g>
              </svg>
              <div className={styles.chartCallout}>
                <span>CURRENT SPEND</span>
                <strong>$286</strong>
              </div>
            </div>

            <aside className={styles.exposureCard} aria-labelledby="exposure-heading">
              <div>
                <p className={styles.eyebrow}>FIRM EXPOSURE</p>
                <h3 id="exposure-heading">Where your capital sits.</h3>
              </div>
              <div className={styles.firmRow}>
                <div className={styles.firmMonogram}>L</div>
                <div><strong>Lucid</strong><span>3 evaluations</span></div>
                <strong>$286</strong>
              </div>
              <div className={styles.exposureBar}><span /></div>
              <div className={styles.exposureMeta}>
                <span>Share of spend</span><strong>100%</strong>
              </div>
              <p className={styles.exposureNote}>
                All current evaluation cost is concentrated with one firm.
              </p>
            </aside>
          </div>
        </section>

        <section className={styles.ledgerSection} aria-labelledby="ledger-heading">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>LEDGER</p>
              <h2 id="ledger-heading">Every dollar accounted for.</h2>
              <p>All spend and payout entries in one clean record.</p>
            </div>
            <div className={styles.ledgerTools}>
              <span>3 entries</span>
              <button type="button" aria-label="Filter by firm">All firms⌄</button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr><th>Date</th><th>Type</th><th>Firm</th><th>Category</th><th>Amount</th><th><span className={styles.srOnly}>Actions</span></th></tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.date}>
                    <td>{entry.date}</td>
                    <td><span className={styles.typePill}>Spend</span></td>
                    <td><span className={styles.firmCell}><i>L</i>{entry.firm}</span></td>
                    <td>Evaluation</td>
                    <td className={styles.negative}>−{entry.amount}</td>
                    <td><Link href="/prop-economics">Edit ↗</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>LIBERTRADE LOOP</span>
          <p>Preview only. The current Prop Profit Tracker remains unchanged.</p>
        </footer>
      </div>
    </main>
  );
}
