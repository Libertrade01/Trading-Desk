import Link from "next/link";
import styles from "./AdminDashboard.module.css";

const number = new Intl.NumberFormat("en-GB");
const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function formatDate(value, includeTime = false) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return (includeTime ? dateTime : shortDate).format(date);
}

function MetricCard({ label, value, note, accent = false }) {
  return (
    <article className={`${styles.metricCard}${accent ? ` ${styles.metricCardAccent}` : ""}`}>
      <span>{label}</span>
      <strong>{typeof value === "number" ? number.format(value) : value}</strong>
      <small>{note}</small>
    </article>
  );
}

function StatusPill({ active, children }) {
  return <span className={`${styles.statusPill} ${active ? styles.statusPillOn : styles.statusPillOff}`}>{children}</span>;
}

function Funnel({ accounts }) {
  const stages = [
    { label: "Accounts", value: accounts.total, rate: 100 },
    {
      label: "Email confirmed",
      value: accounts.confirmed,
      rate: accounts.total ? Math.round((accounts.confirmed / accounts.total) * 100) : 0,
    },
    { label: "Onboarding complete", value: accounts.onboarded, rate: accounts.onboardingRate },
    { label: "First LOOP closed", value: accounts.firstLoop, rate: accounts.firstLoopRate },
  ];

  return (
    <div className={styles.funnel}>
      {stages.map((stage, index) => (
        <div className={styles.funnelStage} key={stage.label}>
          <div className={styles.funnelTopline}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{number.format(stage.value)}</strong>
          </div>
          <p>{stage.label}</p>
          <div className={styles.progressTrack} aria-label={`${stage.rate}% of accounts`}>
            <span style={{ width: `${Math.max(2, stage.rate)}%` }} />
          </div>
          <small>{stage.rate}% of accounts</small>
        </div>
      ))}
    </div>
  );
}

function TrafficPanel({ traffic }) {
  if (traffic.status !== "available") {
    return (
      <div className={styles.integrationEmpty}>
        <div className={styles.integrationIcon}>V</div>
        <div>
          <strong>{traffic.status === "error" ? "Vercel traffic unavailable" : "Connect Vercel Analytics"}</strong>
          <p>{traffic.message}</p>
          {traffic.status === "not_configured" && (
            <small>Required server variables: VERCEL_ANALYTICS_TOKEN and VERCEL_ANALYTICS_PROJECT_ID.</small>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.trafficMetrics}>
        <MetricCard label="Page views" value={traffic.totals7.pageviews} note="Last 7 days" accent />
        <MetricCard label="Visitors" value={traffic.totals7.visitors} note="Last 7 days" />
        <MetricCard label="Page views" value={traffic.totals30.pageviews} note="Last 30 days" />
        <MetricCard label="Visitors" value={traffic.totals30.visitors} note="Last 30 days" />
      </div>
      <div className={styles.trafficLists}>
        <div>
          <h3>Top public pages</h3>
          <ol className={styles.rankList}>
            {traffic.topPublicPages.length ? traffic.topPublicPages.map((row) => (
              <li key={row.requestPath || "unknown"}>
                <code>{row.requestPath || "Unknown"}</code>
                <span>{number.format(Number(row.pageviews || 0))} views</span>
              </li>
            )) : <li className={styles.mutedRow}>No page data yet.</li>}
          </ol>
        </div>
        <div>
          <h3>Top referrers</h3>
          <ol className={styles.rankList}>
            {traffic.topReferrers.length ? traffic.topReferrers.map((row, index) => (
              <li key={`${row.referrerHostname || "direct"}-${index}`}>
                <span>{row.referrerHostname || "Direct / unknown"}</span>
                <span>{number.format(Number(row.visitors || 0))} visitors</span>
              </li>
            )) : <li className={styles.mutedRow}>No referrer data yet.</li>}
          </ol>
        </div>
      </div>
    </>
  );
}

export default function AdminDashboard({ metrics, error }) {
  if (error || !metrics) {
    return (
      <main className={styles.page}>
        <div className={styles.errorCard}>
          <span>Operations console</span>
          <h1>Metrics unavailable.</h1>
          <p>{error}</p>
          <Link href="/admin">Try again</Link>
        </div>
      </main>
    );
  }

  const { accounts, activity, recentUsers, traffic } = metrics;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Founder only</span>
          <h1>Operations console.</h1>
          <p>Accounts, activation, product usage and public traffic in one private view.</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.liveBadge}><i /> Live operations</span>
          <Link className={styles.refreshButton} href="/admin">Refresh</Link>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>01 / Growth</span>
            <h2>Account pulse.</h2>
          </div>
          <small>Updated {formatDate(metrics.generatedAt, true)}</small>
        </div>
        <div className={styles.metricGrid}>
          <MetricCard label="Total accounts" value={accounts.total} note={`${accounts.confirmed} email confirmed`} accent />
          <MetricCard label="New accounts" value={accounts.signups7} note={`${accounts.signups30} in the last 30 days`} />
          <MetricCard label="Onboarded" value={accounts.onboarded} note={`${accounts.onboardingRate}% completion rate`} />
          <MetricCard label="First LOOP" value={accounts.firstLoop} note={`${accounts.firstLoopRate}% of all accounts`} />
        </div>
        <Funnel accounts={accounts} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>02 / Product</span>
            <h2>Usage signals.</h2>
          </div>
          <small>Counts only. No journal or trade content is shown.</small>
        </div>
        <div className={styles.activityGrid}>
          <MetricCard label="Active users" value={activity.active7} note={`${activity.active30} active in 30 days`} accent />
          <MetricCard label="Check-ins" value={activity.checkins7} note={`${activity.checkins30} in 30 days`} />
          <MetricCard label="Session plans" value={activity.plans7} note={`${activity.plans30} in 30 days`} />
          <MetricCard label="LOOPs closed" value={activity.loops7} note={`${activity.loops30} in 30 days`} />
          <MetricCard label="Trades recorded" value={activity.trades7} note={`${activity.trades30} in 30 days`} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>03 / Traffic</span>
            <h2>Public site reach.</h2>
          </div>
          <small>Anonymous, aggregated Vercel Web Analytics.</small>
        </div>
        <TrafficPanel traffic={traffic} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span>04 / Accounts</span>
            <h2>Recent signups.</h2>
          </div>
          <small>Emails are masked by design.</small>
        </div>
        <div className={styles.tableShell}>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Joined</th>
                <th>Email</th>
                <th>Onboarding</th>
                <th>First LOOP</th>
                <th>Last active</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length ? recentUsers.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong><small>{user.email}</small></td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td><StatusPill active={user.confirmed}>{user.confirmed ? "Confirmed" : "Pending"}</StatusPill></td>
                  <td><StatusPill active={user.onboarded}>{user.onboarded ? "Complete" : "Not complete"}</StatusPill></td>
                  <td><StatusPill active={user.firstLoop}>{user.firstLoop ? "Closed" : "Not yet"}</StatusPill></td>
                  <td>{formatDate(user.lastActiveAt, true)}</td>
                </tr>
              )) : (
                <tr><td colSpan="6" className={styles.emptyTable}>No customer accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className={styles.privacyFooter}>
        <span>Privacy boundary</span>
        <p>This view exposes operational counts and account state only. It does not display journal entries, readiness answers, trading theses, or individual P&amp;L.</p>
      </footer>
    </main>
  );
}
