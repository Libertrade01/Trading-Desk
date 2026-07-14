"use client";

import { useState } from "react";
import styles from "./sidebar-icon-options.module.css";

const ROWS = [
  { id: "home", label: "Home", prompt: "The starting point", options: [
    ["House", <><path d="M3 10 10 4l7 6v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 18v-5h4v5"/></>],
    ["Horizon", <><path d="M3 16V8l7-5 7 5v8"/><path d="M6 16v-5h8v5M2 18h16"/></>],
    ["Command", <><path d="M3 10h14M10 3v14"/><rect x="3" y="3" width="14" height="14" rx="3"/></>],
  ]},
  { id: "checkin", label: "Check-in", prompt: "Readiness and self-assessment", options: [
    ["Pulse", <><path d="M3 10h3l1.8-4.5L11 14l2-5 1.4 2H17"/><circle cx="10" cy="10" r="8"/></>],
    ["Target check", <><circle cx="10" cy="10" r="7.5"/><circle cx="10" cy="10" r="3.5"/><path d="m8.3 10 1.2 1.2 2.5-2.7"/></>],
    ["Readiness dial", <><path d="M3 14a8 8 0 0 1 14 0"/><path d="m10 13 3.5-4.5"/><circle cx="10" cy="13" r="1.25"/></>],
  ]},
  { id: "plan", label: "Session Plan", prompt: "Structure before execution", options: [
    ["Plan file", <><path d="M4 3h5l2 2h5v12H4z"/><path d="M7 9h6M7 12h4"/><circle cx="13" cy="14" r="2"/></>],
    ["Route", <><circle cx="4" cy="5" r="1.5"/><circle cx="16" cy="15" r="1.5"/><path d="M5.5 5h4a3 3 0 0 1 0 6h-1A3.5 3.5 0 0 0 5 14.5V15h9.5"/></>],
    ["Levels", <><path d="M3 5h14M3 10h14M3 15h14"/><circle cx="7" cy="5" r="1.5" fill="currentColor"/><circle cx="13" cy="10" r="1.5" fill="currentColor"/><circle cx="9" cy="15" r="1.5" fill="currentColor"/></>],
  ]},
  { id: "close", label: "Close the LOOP", prompt: "Complete and reflect", options: [
    ["Loop check", <><path d="M17 6a8 8 0 1 0 .5 7"/><path d="M13 3h4v4"/><path d="m7 10 2 2 4-4"/></>],
    ["Journal close", <><path d="M4 3h11a1 1 0 0 1 1 1v13H6a2 2 0 0 1-2-2z"/><path d="M4 14h12M7 7h6M7 10h4"/></>],
    ["Closing bell", <><path d="M5 14h10M7 14V9a3 3 0 0 1 6 0v5M8 17h4"/><path d="M10 3V1.5M4.5 5 3 3.5M15.5 5 17 3.5"/></>],
  ]},
  { id: "intelligence", label: "LOOP Intelligence", prompt: "Pattern recognition and guidance", options: [
    ["Network", <><circle cx="5" cy="10" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="15" r="1.5"/><path d="m6.4 9.3 7.2-3.6M6.4 10.7l7.2 3.6M15 6.5v7"/></>],
    ["Signal spark", <><path d="m10 2 1.7 5.1L17 9l-5.3 1.9L10 16l-1.7-5.1L3 9l5.3-1.9z"/><path d="M16 14v4M14 16h4"/></>],
    ["Insight eye", <><path d="M2.5 10s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5z"/><circle cx="10" cy="10" r="2.25"/><path d="M10 1.5v2M3.5 3.5 5 5"/></>],
  ]},
  { id: "profit", label: "Prop Profit Tracker", prompt: "Capital and account economics", options: [
    ["Dollar mark", <><circle cx="10" cy="10" r="8"/><path d="M13 6.5H8.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H7M10 4.5v11"/></>],
    ["Profit rise", <><path d="M3 16V4M3 16h14"/><path d="m6 13 3-4 2.5 2 4.5-6"/><path d="M13 5h3v3"/><text x="6" y="8" fill="currentColor" stroke="none" fontSize="6">$</text></>],
    ["Capital stack", <><ellipse cx="10" cy="5" rx="6" ry="2.5"/><path d="M4 5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5M4 9v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V9"/><path d="M10 3.5v3"/></>],
  ]},
  { id: "settings", label: "Settings", prompt: "Configuration and controls", options: [
    ["Cog", <><circle cx="10" cy="10" r="2.5"/><path d="m8.6 2.6.4-1.3h2l.4 1.3 1.5.6 1.2-.7 1.4 1.4-.7 1.2.6 1.5 1.3.4v2l-1.3.4-.6 1.5.7 1.2-1.4 1.4-1.2-.7-1.5.6-.4 1.3H9l-.4-1.3-1.5-.6-1.2.7-1.4-1.4.7-1.2-.6-1.5-1.3-.4V7l1.3-.4.6-1.5-.7-1.2 1.4-1.4 1.2.7z"/></>],
    ["Sliders", <><path d="M4 3v14M10 3v14M16 3v14"/><circle cx="4" cy="7" r="2"/><circle cx="10" cy="13" r="2"/><circle cx="16" cy="8" r="2"/></>],
    ["Control dial", <><circle cx="10" cy="10" r="7.5"/><path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3"/><circle cx="10" cy="10" r="3"/><path d="m10 10 2-2"/></>],
  ]},
];

const LIVE_SELECTION = {
  home: 2,
  checkin: 0,
  plan: 0,
  close: 0,
  intelligence: 0,
  profit: 2,
  settings: 1,
};

function OptionIcon({ children }) { return <svg viewBox="0 0 20 20" aria-hidden="true">{children}</svg>; }

export default function SidebarIconOptions() {
  const [selected, setSelected] = useState(LIVE_SELECTION);
  return <main className={styles.page}>
    <header><div><img src="/brand/loop-wordmark-sidebar.png" alt="LOOP"/><span>ICON STUDY</span></div><div><h1>Choose the marks.</h1><p>Three relevant directions for each destination. Option A is the temporary live default.</p></div><a href="/home">View live sidebar →</a></header>
    <section className={styles.sheet}>
      {ROWS.map(row => <article key={row.id}><div className={styles.rowLabel}><span>{row.label}</span><small>{row.prompt}</small></div><div className={styles.options}>{row.options.map((option,index) => <button key={option[0]} className={selected[row.id] === index ? styles.selected : ""} onClick={() => setSelected(current => ({...current,[row.id]:index}))}><i>{String.fromCharCode(65+index)}</i><span className={styles.plate}><OptionIcon>{option[1]}</OptionIcon></span><b>{option[0]}</b>{index === LIVE_SELECTION[row.id] && <em>LIVE</em>}</button>)}</div></article>)}
    </section>
    <footer><span>CURRENT PICKS</span>{ROWS.map(row => <p key={row.id}><b>{row.label}</b>{row.options[selected[row.id]][0]}</p>)}</footer>
  </main>;
}
