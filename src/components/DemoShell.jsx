"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function SidebarIcon({ name }) {
  const paths = {
    home: <><rect x="2.25" y="2.25" width="11.5" height="11.5" rx="2.25"/><path d="M2.25 8h11.5M8 2.25v11.5"/></>,
    checkin: <><path d="M2.25 8h2.2l1.45-3.25L8.2 11l1.65-4 1.2 2.25h2.7"/><path d="M8 1.75a6.25 6.25 0 1 1-5.2 2.8"/></>,
    plan: <><path d="M3 3.25h4l1 1.5h5v9.75H3z"/><path d="M5.25 8h5.5M5.25 11h3.5"/><circle cx="11.5" cy="11.75" r="1.75"/></>,
    close: <><path d="M13.5 5.25A6 6 0 1 0 14 10"/><path d="M10.5 2.75h3v3"/><path d="m5.5 8.25 2 2 3.25-3.25"/></>,
    stats: <><path d="M2 14V8.5h3V14M6.5 14V5h3v9M11 14V2.5h3V14"/><path d="M1.5 14h13"/></>,
    history: <><path d="M3.4 4.35A6 6 0 1 1 2.25 9"/><path d="M2 3.25v3.5h3.5"/><path d="M8 4.75v3.5l2.4 1.45"/></>,
    calendar: <><rect x="2" y="3.5" width="12" height="10.75" rx="1.25"/><path d="M2 6.75h12M5 1.75v3M11 1.75v3M5 9.25h2M9 9.25h2M5 11.75h2"/></>,
    profit: <><ellipse cx="8" cy="4.25" rx="5.25" ry="2"/><path d="M2.75 4.25v3.5c0 1.1 2.35 2 5.25 2s5.25-.9 5.25-2v-3.5M2.75 7.75v3.5c0 1.1 2.35 2 5.25 2s5.25-.9 5.25-2v-3.5"/><path d="M8 3v2.5"/></>,
  };
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

const DEMO_NAV = [
  { id: "home", href: "/demo", label: "Home", icon: <SidebarIcon name="home" /> },
  { type: "label", text: "Daily", className: "sidebar-nav-label--daily" },
  { id: "premarket", href: "/demo/premarket", label: "Check-in", icon: <SidebarIcon name="checkin" /> },
  { id: "dailyplan", href: "/demo/plan", label: "Session Plan", icon: <SidebarIcon name="plan" /> },
  { id: "postmarket", href: "/demo/postmarket", label: "Close the LOOP", icon: <SidebarIcon name="close" /> },
  { id: "analytics", href: "/demo/stats", label: "Stats", icon: <SidebarIcon name="stats" /> },
  { type: "label", text: "Explore", className: "sidebar-nav-label--section-gap" },
  { id: "propeconomics", href: "/demo/prop-economics", label: "Prop Profit Tracker", icon: <SidebarIcon name="profit" /> },
  { id: "history", label: "Past sessions", icon: <SidebarIcon name="history" />, disabled: true },
  { id: "weeklyreview", label: "Weekly Review", icon: <SidebarIcon name="calendar" />, disabled: true },
];

function isActive(pathname, href) {
  if (href === "/demo") return pathname === "/demo";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DemoShell({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="demo-layout">
      <div className="demo-banner" role="status">
        <div className="demo-banner-copy">
          <strong>Demo mode</strong>
          <span>Seeded sample data. Changes are disabled.</span>
        </div>
        <Link href="/signup" className="demo-banner-cta">
          Create your account
        </Link>
      </div>

      <div className="app-layout demo-app-body">
        <div className={`sidebar-overlay${sidebarOpen ? " visible" : ""}`} onClick={() => setSidebarOpen(false)} />
        <button className="sidebar-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle menu">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h12M3 9h12M3 13h12"/></svg>
        </button>

        <aside className={`sidebar demo-sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="sidebar-brand">
            <img src="/brand/loop-wordmark-sidebar.png" alt="Libertrade Loop" className="sidebar-brand-logo" />
            <span className="demo-sidebar-badge">DEMO</span>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-nav-main">
              {DEMO_NAV.map((item, i) => {
                if (item.type === "label") {
                  return (
                    <div
                      key={`label-${i}`}
                      className={`sidebar-nav-label${item.className ? ` ${item.className}` : ""}`}
                    >
                      {item.text}
                    </div>
                  );
                }
                if (item.disabled) {
                  return (
                    <span
                      key={item.id}
                      className="sidebar-nav-item demo-nav-item--disabled"
                      title="Available in your own account"
                    >
                      {item.icon}
                      {item.label}
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`sidebar-nav-item${isActive(pathname, item.href) ? " active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-footer-email" title="Demo visitor">
              demo visitor
            </div>
            <Link href="/signup" className="sidebar-logout-btn demo-signup-btn">
              Create account
            </Link>
            <Link href="/login" className="demo-signin-link">
              Sign in
            </Link>
          </div>
        </aside>

        <main className="main-content demo-main">{children}</main>
      </div>
    </div>
  );
}
