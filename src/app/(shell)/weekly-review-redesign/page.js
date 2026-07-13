import Link from "next/link";
import styles from "./weekly-review-redesign.module.css";

export const metadata = {
  title: "Weekly Review Redesign Preview | Libertrade LOOP",
  robots: { index: false, follow: false },
};

const weeks = ["This week · Jul 13–17", "Jul 6–10", "Jun 29 – Jul 3", "Jun 22–26", "Jun 15–19"];
const accountability = [
  ["Risk violations", "1"],
  ["Emotional trading", "1"],
  ["Execution quality", "2"],
  ["Process drift", "1"],
];
const flags = [
  { tone: "warn", title: "Weak close loop scores", detail: "Average process slider score 4.8/10 — below target." },
  { tone: "danger", title: "Playbook below target", detail: "16% avg adherence — target is 80%." },
  { tone: "good", title: "Risk plan intact", detail: "Risk plan followed every day you completed close loop." },
];
const days = [
  ["Mon, Jul 13", "76", "Overtraded, FOMO entry, Entered early, Exited from emotion, Ignored poor state", "16%", "Yes"],
  ["Tue, Jul 14", "—", "—", "—", "—"],
  ["Wed, Jul 15", "—", "—", "—", "—"],
  ["Thu, Jul 16", "—", "—", "—", "—"],
  ["Fri, Jul 17", "—", "—", "—", "—"],
];
const comparisons = [
  ["Avg readiness", "76", "73", "+3", "up"],
  ["Playbook", "16%", "49%", "−33 pts", "down"],
  ["Risk plan", "1/1", "4/4", "−3 days", "down"],
  ["Behavioral flags", "5", "10", "−5", "up"],
];

function ScoreCard({ index, label, value, delta, tone, width }) {
  return (
    <article className={styles.scoreCard}>
      <div className={styles.cardLabel}><span>0{index}</span>{label}</div>
      <div className={styles.scoreValue}>{value}</div>
      <div className={`${styles.delta} ${styles[tone]}`}>{delta}</div>
      <div className={styles.scoreTrack}><span className={styles[tone]} style={{ width }} /></div>
    </article>
  );
}

export default function WeeklyReviewRedesignPreview() {
  return (
    <div className={styles.page}>
      <div className={styles.previewBar}>
        <span><i /> Design preview</span>
        <Link href="/weekly-review">View current page ↗</Link>
      </div>

      <div className={styles.topbar}>MONDAY, JUL 13, 2026</div>

      <nav className={styles.weekRail} aria-label="Review week preview">
        <span className={styles.railLabel}>REVIEWS</span>
        <div className={styles.weekList}>
          {weeks.map((week, index) => <button type="button" className={index === 0 ? styles.activeWeek : ""} key={week}>{week}</button>)}
        </div>
      </nav>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>JUL 13–17</p>
          <h1>Weekly Review<span className={styles.titleStop} /></h1>
          <p className={styles.intro}>Turn the week into a clearer process for the next one.</p>
        </div>
        <div className={styles.draftBadge}><i /> Draft</div>
      </header>

      <section className={styles.weekStatement}>
        <label htmlFor="preview-week-line"><span>WEEK IN ONE LINE</span><strong>01</strong></label>
        <input id="preview-week-line" type="text" placeholder="Summarize the week in a single sentence…" />
      </section>

      <section className={styles.scoreSection} aria-labelledby="signal-heading">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>THE SIGNAL</p>
          <h2 id="signal-heading">Your process at a glance.</h2>
          <p>Readiness improved. Playbook adherence slipped. Risk stayed intact.</p>
        </div>
        <div className={styles.scoreGrid}>
          <ScoreCard index={1} label="Avg readiness" value="76" delta="+3 vs last week" tone="up" width="76%" />
          <ScoreCard index={2} label="Playbook" value="16%" delta="−33 pts vs last week" tone="danger" width="16%" />
          <ScoreCard index={3} label="Risk plan" value="1/1" delta="−3 days vs last week" tone="danger" width="100%" />
        </div>
      </section>

      <section className={styles.comparisonSection} aria-labelledby="comparison-heading">
        <div className={styles.comparisonCopy}><p className={styles.eyebrow}>WEEK OVER WEEK</p><h2 id="comparison-heading">This week versus last.</h2><p>See whether the core process metrics are moving in the right direction.</p></div>
        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonHead}><span>Metric</span><span>This week</span><span>Last week</span><span>Change</span></div>
          {comparisons.map(([metric, current, prior, change, tone]) => <div className={styles.comparisonRow} key={metric}><strong>{metric}</strong><span>{current}</span><span>{prior}</span><span className={styles[tone]}>{change}</span></div>)}
        </div>
      </section>

      <section className={styles.accountabilitySection} aria-labelledby="accountability-heading">
        <div className={styles.sectionHeader}>
          <div><p className={styles.eyebrow}>ACCOUNTABILITY</p><h2 id="accountability-heading">What held. What slipped.</h2></div>
          <p>Patterns are useful when they become decisions.</p>
        </div>
        <div className={styles.accountabilityLayout}>
          <div className={styles.behaviorGrid}>
            {accountability.map(([label, count], index) => (
              <article key={label} className={styles.behaviorCard}><span>0{index + 1}</span><strong>{count}</strong><p>{label}</p></article>
            ))}
          </div>
          <div className={styles.flagsPanel}>
            <div className={styles.flagsTitle}><h3>Flags</h3><span>3</span></div>
            {flags.map((flag) => (
              <article className={`${styles.flag} ${styles[flag.tone]}`} key={flag.title}><i /><div><strong>{flag.title}</strong><p>{flag.detail}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.daySection} aria-labelledby="day-heading">
        <div className={styles.sectionHeader}>
          <div><p className={styles.eyebrow}>DAILY EVIDENCE</p><h2 id="day-heading">Day by day.</h2></div>
          <p>See where the process held and where it drifted.</p>
        </div>
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Day</th><th>Ready</th><th>Flags</th><th>Playbook</th><th>Risk</th></tr></thead>
            <tbody>{days.map((day, index) => <tr key={day[0]} className={index ? styles.emptyDay : ""}><td><span className={styles.dayDot} />{day[0]}</td><td>{day[1]}</td><td>{day[2]}</td><td>{day[3]}</td><td>{day[4]}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className={styles.followUpSection} aria-labelledby="follow-up-heading">
        <div className={styles.sectionHeader}>
          <div><p className={styles.eyebrow}>FOLLOW THROUGH</p><h2 id="follow-up-heading">Did you hold last week&apos;s commitment?</h2></div>
          <p>If no, say what got in the way.</p>
        </div>
        <div className={styles.followUpList}>
          {["Wait for Bar Closes for Price Action Signals", "Do not overtrade."].map((item, index) => (
            <div className={styles.followUpRow} key={item}><span>0{index + 1}</span><strong>{item}</strong><div><button type="button">Y</button><button type="button">N</button></div></div>
          ))}
        </div>
      </section>

      <section className={styles.reflectionSection} aria-labelledby="reflection-heading">
        <div className={styles.sectionHeader}><div><p className={styles.eyebrow}>REFLECTION</p><h2 id="reflection-heading">Spot the pattern. Refine the process.</h2></div><p>Three questions. Honest answers.</p></div>
        <div className={styles.reflectionGrid}>
          <label><span>01</span><strong>What showed up more than once in your behavior, not the market?</strong><textarea rows={4} placeholder="e.g. getting chopped up at the open before price settles…" /></label>
          <label><span>02</span><strong>Which day was the turning point, and what was different about you?</strong><textarea rows={4} placeholder="e.g. Tuesday, traded with poor readiness and external distractions…" /></label>
          <label><span>03</span><strong>What is the earliest sign you are slipping next week, and what will you do?</strong><textarea rows={4} placeholder="e.g. Take a five minute walk or stretch…" /></label>
        </div>
      </section>

      <section className={styles.nextWeekSection} aria-labelledby="next-week-heading">
        <div><p className={styles.eyebrow}>NEXT WEEK</p><h2 id="next-week-heading">Set your focus for next week.</h2><p>Set two priorities to carry into every session.</p></div>
        <div className={styles.focusFields}><label><span>01</span><input type="text" placeholder="Focus item 1" /></label><label><span>02</span><input type="text" placeholder="Focus item 2" /></label></div>
        <div className={styles.saveArea}><p>Complete when week in one line and both focus items are filled.</p><button type="button">Save draft <span>↗</span></button></div>
      </section>

      <footer className={styles.footer}><span>LIBERTRADE LOOP</span><p>Design preview only. The current Weekly Review remains unchanged.</p></footer>
    </div>
  );
}
