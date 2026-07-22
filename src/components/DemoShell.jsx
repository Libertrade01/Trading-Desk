"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function SidebarIcon({ name }) {
  const paths = {
    home: <><rect x="2.25" y="2.25" width="11.5" height="11.5" rx="2.25"/><path d="M2.25 8h11.5M8 2.25v11.5"/></>,
    stats: <><path d="M2 14V8.5h3V14M6.5 14V5h3v9M11 14V2.5h3V14"/><path d="M1.5 14h13"/></>,
    history: <><path d="M3.4 4.35A6 6 0 1 1 2.25 9"/><path d="M2 3.25v3.5h3.5"/><path d="M8 4.75v3.5l2.4 1.45"/></>,
    calendar: <><rect x="2" y="3.5" width="12" height="10.75" rx="1.25"/><path d="M2 6.75h12M5 1.75v3M11 1.75v3M5 9.25h2M9 9.25h2M5 11.75h2"/></>,
  };
  return (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

const DEMO_NAV = [
  { id: "home", href: "/demo", label: "Home", icon: <SidebarIcon name="home" /> },
  { type: "label", text: "Explore" },
  { id: "analytics", href: "/demo/stats", label: "Stats", icon: <SidebarIcon name="stats" /> },
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
                  return <div key={`label-${i}`} className="sidebar-nav-label">{item.text}</div>;
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
