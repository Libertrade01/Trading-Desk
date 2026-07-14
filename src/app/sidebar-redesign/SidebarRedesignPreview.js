"use client";

import { useEffect, useState } from "react";
import styles from "./sidebar-redesign.module.css";
import effects from "./sidebar-effects.module.css";

const CONCEPTS = [
  { id: "precision", number: "01", name: "Precision line", note: "Closest evolution" },
  { id: "instruments", number: "02", name: "Instrument plates", note: "Tactile icons" },
  { id: "signal", number: "03", name: "Signal rail", note: "Stronger structure" },
  { id: "quiet", number: "04", name: "Quiet marks", note: "Calm and minimal" },
  { id: "depth", number: "05", name: "Layered depth", note: "Premium finish" },
];

const NAV = [
  { id: "home", label: "Home", icon: "home", active: true },
  { type: "label", label: "Daily" },
  { id: "checkin", label: "Check-in", icon: "target" },
  { id: "plan", label: "Session Plan", icon: "plan" },
  { id: "close", label: "Close the LOOP", icon: "trend" },
  { id: "stats", label: "Stats", icon: "stats" },
  { type: "label", label: "Review" },
  { id: "history", label: "Past sessions", icon: "history" },
  { id: "weekly", label: "Weekly Review", icon: "calendar" },
  { id: "intel", label: "LOOP Intelligence", icon: "spark" },
  { id: "prop", label: "Prop Profit Tracker", icon: "cube" },
  { id: "settings", label: "Settings", icon: "settings", spaced: true },
];

function Icon({ name }) {
  const paths = {
    home: <><rect x="2.75" y="2.75" width="5.25" height="5.25" rx="1"/><rect x="12" y="2.75" width="5.25" height="5.25" rx="1"/><rect x="2.75" y="12" width="5.25" height="5.25" rx="1"/><rect x="12" y="12" width="5.25" height="5.25" rx="1"/></>,
    target: <><circle cx="10" cy="10" r="6.25"/><circle cx="10" cy="10" r="2"/><path d="M10 1.75v2M10 16.25v2"/></>,
    plan: <><circle cx="10" cy="10" r="7"/><path d="M10 6v4.4l3 1.8"/><circle cx="10" cy="10" r=".6" fill="currentColor" stroke="none"/></>,
    trend: <><path d="M3 15.5h14"/><path d="m4.5 13 3.25-3.4 2.5 2 4.5-5.1"/><path d="M12.4 6.5h2.35v2.35"/></>,
    stats: <><path d="M3 17V10.5h3V17M8.5 17V6.5h3V17M14 17V3h3v14"/><path d="M2 17h16"/></>,
    history: <><path d="M4.15 5.4A7 7 0 1 1 3 11"/><path d="M2.5 4.25v3.5H6"/><path d="M10 6.25v4.1l2.7 1.65"/></>,
    calendar: <><rect x="3" y="4.25" width="14" height="12.75" rx="1.5"/><path d="M3 8h14M6.25 2.5v3.25M13.75 2.5v3.25M6.5 11h2M11.5 11h2M6.5 14h2"/></>,
    spark: <><path d="m10 2.5 1.55 4.15L16 8.2l-4.45 1.55L10 14l-1.55-4.25L4 8.2l4.45-1.55L10 2.5z"/><path d="m15.5 13 .65 1.85L18 15.5l-1.85.65L15.5 18l-.65-1.85L13 15.5l1.85-.65.65-1.85z"/></>,
    cube: <><path d="m10 2.5 6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5L10 2.5z"/><path d="m3.5 6.25 6.5 3.8 6.5-3.8M10 10.05v7.45"/></>,
    settings: <><circle cx="10" cy="10" r="2.35"/><path d="M10 2.25v2M10 15.75v2M2.25 10h2M15.75 10h2M4.5 4.5l1.4 1.4M14.1 14.1l1.4 1.4M4.5 15.5l1.4-1.4M14.1 5.9l1.4-1.4"/></>,
    desk: <><path d="M3 5h14M3 10h10M3 15h12"/><circle cx="16.5" cy="10" r="1" fill="currentColor" stroke="none"/></>,
    wiki: <><path d="M3 3.5h6.5A2.5 2.5 0 0 1 12 6v10.5H5.5A2.5 2.5 0 0 0 3 19V3.5z"/><path d="M17 3.5h-5A2.5 2.5 0 0 0 9.5 6v10.5h5A2.5 2.5 0 0 1 17 19V3.5z"/></>,
  };
  return <span className={styles.iconWrap}><svg viewBox="0 0 20 20" aria-hidden="true">{paths[name]}</svg></span>;
}

function Sidebar({ concept }) {
  return (
    <aside className={`${styles.sidebar} ${styles[`sidebar_${concept}`]} ${effects.anchor}`}>
      <div className={styles.brand}><img src="/brand/loop-wordmark-sidebar.png" alt="LOOP" /></div>
      <nav aria-label="Sidebar concept navigation">
        {NAV.map((item, index) => item.type === "label"
          ? <span className={styles.sectionLabel} key={`${item.label}-${index}`}><i />{item.label}</span>
          : <a className={`${item.active ? styles.active : ""}${item.spaced ? ` ${styles.spaced}` : ""}`} key={item.id}><Icon name={item.icon}/><span>{item.label}</span>{item.active && <b aria-hidden="true"/>}</a>)}
      </nav>
      <div className={styles.founder}>
        <span className={styles.sectionLabel}><i/>Founder</span>
        <a><Icon name="desk"/><span>Trade Desk</span></a>
        <a><Icon name="wiki"/><span>Wiki</span></a>
      </div>
      <footer><small>midefi@protonmail.com</small><button>Sign out</button></footer>
    </aside>
  );
}

function DashboardContext() {
  return <main className={styles.dashboard}>
    <header><div><h1>Good morning, Mike.</h1><p>Tuesday, July 14, 2026</p></div><div className={styles.cpi}><i/>CPI <span>CPI release</span><b>8:30 AM ET</b></div></header>
    <section className={styles.hero}><div><small>1 OF 3 COMPLETE</small><h2>Morning underway.</h2><p>Check-in done · Session plan + Close loop open</p></div><aside><small>READINESS</small><strong>62</strong><p>Neutral · trade selectively</p></aside></section>
    <div className={styles.focus}><small>THIS WEEK&apos;S FOCUS</small><span>Wait for Bar Closes for Price Action Signals</span><i/><span>Do not overtrade.</span></div>
    <section className={styles.loop}><div><small>CONTINUE YOUR LOOP</small><div className={styles.steps}><p>✓ <span>Check-in</span></p><p className={styles.next}>2 <span>Session Plan</span><button>Next →</button></p><p>3 <span>Close loop</span></p></div></div><aside><small>PROCESS CONSISTENCY</small><p>RISK STREAK <strong>13<em>/21</em></strong></p><b><i/></b><p>PLAYBOOK SETUP STREAK <strong>0<em>/21</em></strong></p><b/></aside></section>
  </main>;
}

export default function SidebarRedesignPreview() {
  const [concept, setConcept] = useState("precision");
  useEffect(() => { const requested = new URLSearchParams(window.location.search).get("concept"); if (CONCEPTS.some(item => item.id === requested)) setConcept(requested); }, []);
  const choose = (id) => { setConcept(id); const url = new URL(window.location.href); url.searchParams.set("concept",id); window.history.replaceState({},"",url); };
  return <div className={styles.preview}>
    <header className={styles.switcher}><strong>SIDEBAR STUDY</strong><nav>{CONCEPTS.map(item => <button key={item.id} className={concept === item.id ? styles.selected : ""} onClick={() => choose(item.id)}><i>{item.number}</i><span>{item.name}<small>{item.note}</small></span></button>)}</nav><b>{CONCEPTS.findIndex(item => item.id === concept)+1} / 5</b></header>
    <div className={styles.app}><Sidebar concept={concept}/><DashboardContext/></div>
    <select className={styles.mobileSelect} aria-label="Choose sidebar concept" value={concept} onChange={event => choose(event.target.value)}>{CONCEPTS.map(item => <option key={item.id} value={item.id}>{item.number} — {item.name}</option>)}</select>
  </div>;
}
