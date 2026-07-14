"use client";

import { useEffect, useState } from "react";
import styles from "./home-redesign.module.css";
import effects from "./home-redesign-effects.module.css";

const CONCEPTS = [
  { id: "refined", number: "01", name: "Refined current", note: "Tighter hierarchy" },
  { id: "split", number: "02", name: "Split balance", note: "Metrics alongside" },
  { id: "workflow", number: "03", name: "Workflow first", note: "Steps lead" },
  { id: "metrics", number: "04", name: "Metrics first", note: "Status leads" },
  { id: "air", number: "05", name: "More breathing room", note: "Quieter rhythm" },
];

const icons = {
  home: <><rect x="2" y="2" width="5" height="5" rx=".5"/><rect x="9" y="2" width="5" height="5" rx=".5"/><rect x="2" y="9" width="5" height="5" rx=".5"/><rect x="9" y="9" width="5" height="5" rx=".5"/></>,
  target: <><circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="1.5"/></>,
  clock: <><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></>,
  chart: <><path d="M2 13h12M4 10l3-3 2 2 4-4"/></>,
  bars: <><rect x="2" y="9" width="3" height="5"/><rect x="6.5" y="5" width="3" height="9"/><rect x="11" y="2" width="3" height="12"/></>,
  calendar: <><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M2 6.5h12M5 1.5v3M11 1.5v3"/></>,
  star: <path d="m8 2 1.6 3.2 3.5.5-2.5 2.5.6 3.5L8 10.1l-3.2 1.6.6-3.5-2.5-2.5 3.5-.5L8 2z"/>,
  cube: <><path d="m2 5 6-3 6 3v6l-6 3-6-3z"/><path d="M8 2v12M2 5l6 3 6-3"/></>,
  gear: <><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1"/></>,
};

function NavIcon({ name }) {
  return <svg viewBox="0 0 16 16" aria-hidden="true">{icons[name]}</svg>;
}

function BrandSidebar() {
  const primary = [
    ["home", "Home", "home"], ["label", "Daily"], ["target", "Check-in"], ["clock", "Session Plan"],
    ["chart", "Close the LOOP"], ["bars", "Stats"], ["label", "Review"], ["clock", "Past sessions"],
    ["calendar", "Weekly Review"], ["star", "LOOP Intelligence"], ["cube", "Prop Profit Tracker"], ["gear", "Settings", "spaced"],
  ];
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarBrand}><img src="/brand/loop-wordmark-sidebar.png" alt="LOOP" /></div>
      <nav aria-label="Main navigation">
        {primary.map((item, index) => item[0] === "label"
          ? <span className={styles.navLabel} key={`${item[1]}-${index}`}>{item[1]}</span>
          : <a className={`${item[2] === "home" ? styles.navActive : ""} ${item[2] === "spaced" ? styles.navSpaced : ""}`} key={item[1]}><NavIcon name={item[0]} />{item[1]}</a>)}
      </nav>
      <div className={styles.founder}><span>FOUNDER</span><a>☰ &nbsp; Trade Desk</a><a>▥ &nbsp; Wiki</a></div>
      <div className={styles.account}><small>mike@libertrade.com</small><button>Sign out</button></div>
    </aside>
  );
}

function CpiNotice({ compact = false }) {
  return (
    <div className={`${styles.cpi} ${compact ? styles.cpiCompact : ""}`} role="status">
      <span className={styles.eventDot} />
      <strong>CPI</strong><span>Consumer Price Index release</span><i>·</i><b>8:30 AM ET</b>
      {!compact && <em>High impact</em>}
    </div>
  );
}

function Greeting({ children }) {
  return <header className={styles.greeting}><div><h1>Good morning, Mike.</h1><p>Tuesday, July 14, 2026</p></div>{children}</header>;
}

function FocusStrip() {
  return <div className={styles.focusStrip}><span>THIS WEEK&apos;S FOCUS</span><p>Wait for Bar Closes for Price Action Signals</p><i/><p>Do not overtrade.</p></div>;
}

function Metric({ label, value, goal, progress, ready = false }) {
  return <div className={`${styles.metric} ${ready ? styles.readyMetric : ""}`}><span>{label}</span><strong>{value}{goal && <small>/{goal}</small>}</strong>{progress != null && <div><i style={{width:`${progress}%`}}/></div>}</div>;
}

function Metrics({ readiness = true, compact = false }) {
  return <div className={`${styles.metrics} ${compact ? styles.metricsCompact : ""}`}>
    {readiness && <Metric label="READY" value="62" ready/>}<Metric label="RISK STREAK" value="13" goal="21" progress={62}/><Metric label="PLAYBOOK SETUP STREAK" value="0" goal="21" progress={1}/>
  </div>;
}

function Workflow({ horizontal = false }) {
  return <div className={`${styles.workflowSteps} ${horizontal ? styles.workflowHorizontal : ""}`}>
    <div className={styles.stepDone}><span>✓</span><div><b>Check-in</b><small>Complete</small></div></div>
    <div className={styles.stepActive}><span>2</span><div><b>Session Plan</b><small>Up next</small></div><button>Next →</button></div>
    <div><span>3</span><div><b>Close loop</b><small>After the session</small></div></div>
  </div>;
}

function ReviewStrip() {
  return <div className={styles.review}><strong>REVIEW</strong><span>2 sessions need replay or database checkoffs.</span><button>Show items</button></div>;
}

function HeroTitle({ eyebrow = "1 OF 3 COMPLETE", title = "Morning underway.", copy = "Check-in done · Session plan + Close loop open" }) {
  return <div className={styles.heroTitle}><span>{eyebrow}</span><h2>{title}</h2><p>{copy}</p></div>;
}

function BrandedShell({ children, atmospheric = false }) {
  return <div className={styles.shell}><BrandSidebar/><main className={`${styles.main}${atmospheric ? ` ${effects.atmosphere}` : ""}`}>{children}</main></div>;
}

function RefinedCurrent() {
  return <BrandedShell><div className={styles.pageNarrow}><Greeting/><CpiNotice/>
    <section className={`${styles.hero} ${styles.refinedHero}`}><HeroTitle/><FocusStrip/><div className={styles.rule}/><Metrics/><Workflow/></section><ReviewStrip/>
  </div></BrandedShell>;
}

function SplitBalance() {
  return <BrandedShell><div className={styles.pageWide}><Greeting><CpiNotice compact/></Greeting>
    <section className={styles.splitHero}><div className={styles.splitPrimary}><HeroTitle title="Morning underway."/><FocusStrip/><Workflow/></div><aside><span className={styles.asideLabel}>TODAY&apos;S PROCESS</span><Metrics/><p className={styles.asideNote}>One step complete. Continue with your session plan.</p></aside></section><ReviewStrip/>
  </div></BrandedShell>;
}

function WorkflowFirst() {
  return <BrandedShell><div className={styles.pageWide}><Greeting/><CpiNotice/>
    <section className={styles.workflowHero}><div className={styles.workflowTop}><span>TODAY&apos;S WORKFLOW</span><b>1 of 3 complete</b></div><Workflow horizontal/><div className={styles.workflowBottom}><HeroTitle eyebrow="NEXT STEP" title="Build the plan." copy="Your readiness is logged. Define the structure for today&apos;s session."/><Metrics/></div></section><FocusStrip/><ReviewStrip/>
  </div></BrandedShell>;
}

function MetricsFirst() {
  return <BrandedShell><div className={styles.pageWide}><Greeting><CpiNotice compact/></Greeting>
    <section className={styles.metricsHero}><div className={styles.statusHeader}><div><span>SESSION STATUS</span><h2>Morning underway.</h2></div><p>1 <small>/ 3 complete</small></p></div><Metrics/><div className={styles.metricsBody}><div><HeroTitle eyebrow="YOUR NEXT STEP" title="Session Plan" copy="Check-in complete. Turn today&apos;s readiness into a clear execution plan."/><button className={styles.primaryButton}>Continue →</button></div><Workflow/></div></section><div className={styles.lowerStrips}><FocusStrip/><ReviewStrip/></div>
  </div></BrandedShell>;
}

function BreathingRoom() {
  return <BrandedShell atmospheric><div className={styles.pageAir}><Greeting><CpiNotice compact/></Greeting>
    <section className={styles.airIntro}><HeroTitle/><div className={styles.airReady}><Metric label="READINESS" value="62"/><small>Neutral · trade selectively</small></div></section>
    <FocusStrip/><section className={`${styles.airGrid} ${effects.premiumLoop}`}><div><span className={styles.asideLabel}>CONTINUE YOUR LOOP</span><Workflow/></div><aside><span className={styles.asideLabel}>PROCESS CONSISTENCY</span><Metrics readiness={false}/></aside></section><ReviewStrip/>
  </div></BrandedShell>;
}

const VIEWS = { refined: RefinedCurrent, split: SplitBalance, workflow: WorkflowFirst, metrics: MetricsFirst, air: BreathingRoom };

export default function HomeRedesignPreview() {
  const [concept, setConcept] = useState("refined");
  useEffect(() => { const value = new URLSearchParams(window.location.search).get("concept"); if (VIEWS[value]) setConcept(value); }, []);
  const choose = (id) => { setConcept(id); const url = new URL(window.location.href); url.searchParams.set("concept", id); window.history.replaceState({}, "", url); };
  const View = VIEWS[concept];
  return <div className={styles.preview}>
    <header className={styles.switcher}><strong>HOME LAYOUT STUDY</strong><nav>{CONCEPTS.map(item => <button key={item.id} className={item.id === concept ? styles.selected : ""} onClick={() => choose(item.id)}><i>{item.number}</i><span>{item.name}<small>{item.note}</small></span></button>)}</nav><b>{CONCEPTS.findIndex(item => item.id === concept)+1} / 5</b></header>
    <div className={styles.canvas} key={concept}><View/></div>
    <select className={styles.mobileSelect} value={concept} onChange={event => choose(event.target.value)} aria-label="Choose layout">{CONCEPTS.map(item => <option value={item.id} key={item.id}>{item.number} — {item.name}</option>)}</select>
  </div>;
}
