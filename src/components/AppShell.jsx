"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { loadTraderSettings } from "../lib/trader-settings";
import {
  loadTraderProfile,
  ensureFounderProfile,
  isOnboardingComplete,
} from "../lib/trader-profile";
import { filterNavItems } from "../lib/features";
import { getCurrentUser } from "../lib/user-storage";

function SidebarIcon({ name }) {
  const paths = {
    home: <><rect x="2.25" y="2.25" width="11.5" height="11.5" rx="2.25"/><path d="M2.25 8h11.5M8 2.25v11.5"/></>,
    checkin: <><path d="M2.25 8h2.2l1.45-3.25L8.2 11l1.65-4 1.2 2.25h2.7"/><path d="M8 1.75a6.25 6.25 0 1 1-5.2 2.8"/></>,
    plan: <><path d="M3 3.25h4l1 1.5h5v9.75H3z"/><path d="M5.25 8h5.5M5.25 11h3.5"/><circle cx="11.5" cy="11.75" r="1.75"/></>,
    close: <><path d="M13.5 5.25A6 6 0 1 0 14 10"/><path d="M10.5 2.75h3v3"/><path d="m5.5 8.25 2 2 3.25-3.25"/></>,
    stats: <><path d="M2 14V8.5h3V14M6.5 14V5h3v9M11 14V2.5h3V14"/><path d="M1.5 14h13"/></>,
    history: <><path d="M3.4 4.35A6 6 0 1 1 2.25 9"/><path d="M2 3.25v3.5h3.5"/><path d="M8 4.75v3.5l2.4 1.45"/></>,
    calendar: <><rect x="2" y="3.5" width="12" height="10.75" rx="1.25"/><path d="M2 6.75h12M5 1.75v3M11 1.75v3M5 9.25h2M9 9.25h2M5 11.75h2"/></>,
    intelligence: <><circle cx="4" cy="8" r="1.25"/><circle cx="12" cy="4" r="1.25"/><circle cx="12" cy="12" r="1.25"/><path d="m5.15 7.4 5.7-2.8M5.15 8.6l5.7 2.8M12 5.25v5.5"/><path d="M7.5 2.25 8 3.5l1.25.5L8 4.5l-.5 1.25L7 4.5 5.75 4 7 3.5l.5-1.25z"/></>,
    profit: <><ellipse cx="8" cy="4.25" rx="5.25" ry="2"/><path d="M2.75 4.25v3.5c0 1.1 2.35 2 5.25 2s5.25-.9 5.25-2v-3.5M2.75 7.75v3.5c0 1.1 2.35 2 5.25 2s5.25-.9 5.25-2v-3.5"/><path d="M8 3v2.5"/></>,
    settings: <><path d="M3.25 2v12M8 2v12M12.75 2v12"/><circle cx="3.25" cy="5.5" r="1.65"/><circle cx="8" cy="10.5" r="1.65"/><circle cx="12.75" cy="6.5" r="1.65"/></>,
    desk: <><path d="M2 4h12M2 8h8M2 12h10"/><circle cx="13" cy="8" r="1" fill="currentColor" stroke="none"/></>,
    wiki: <><path d="M2.25 2.5h5A2 2 0 0 1 9.25 4.5v9H4.5a2.25 2.25 0 0 0-2.25 2.25V2.5z"/><path d="M13.75 2.5h-2.5a2 2 0 0 0-2 2v9H11.5a2.25 2.25 0 0 1 2.25 2.25V2.5z"/></>,
    admin: <><rect x="2" y="2.25" width="12" height="11.5" rx="2"/><path d="M5 11V8.75M8 11V5.5M11 11V7"/><path d="M4.5 4.5h2"/></>,
  };
  return <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

const NAV_ITEMS = [
  { id: "home", href: "/home", label: "Home", icon: <SidebarIcon name="home" /> },
  { type: "label", text: "Daily", className: "sidebar-nav-label--daily" },
  { id: "premarket", href: "/premarket", label: "Check-in", icon: <SidebarIcon name="checkin" /> },
  { id: "dailyplan", href: "/plan", label: "Session Plan", icon: <SidebarIcon name="plan" /> },
  { id: "postmarket", href: "/postmarket", label: "Close the LOOP", icon: <SidebarIcon name="close" /> },
  { id: "analytics", href: "/analytics", label: "Stats", icon: <SidebarIcon name="stats" /> },
  { type: "label", text: "Review", className: "sidebar-nav-label--section-gap" },
  { id: "history", href: "/history", label: "Past sessions", icon: <SidebarIcon name="history" /> },
  { id: "weeklyreview", href: "/weekly-review", label: "Weekly Review", icon: <SidebarIcon name="calendar" /> },
  { id: "assistant", href: "/assistant", label: "LOOP Intelligence", icon: <SidebarIcon name="intelligence" /> },
  { id: "propeconomics", href: "/prop-economics", label: "Prop Profit Tracker", icon: <SidebarIcon name="profit" /> },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    className: "sidebar-nav-item--section-gap",
    icon: <SidebarIcon name="settings" />,
  },
];

const FOUNDER_NAV_ITEMS = [
  { id: "admin", href: "/admin", label: "Operations", icon: <SidebarIcon name="admin" /> },
  { id: "desk", href: "/desk", label: "Trade Desk", icon: <SidebarIcon name="desk" /> },
  { id: "wiki", href: "/wiki", label: "Wiki", icon: <SidebarIcon name="wiki" /> },
];

function isNavActive(pathname, item, settingsSection) {
  if (item.id === "home") return pathname === "/home";
  if (item.id === "history") return pathname === "/history" || pathname.startsWith("/history/");
  if (item.id === "weeklyreview") return pathname === "/weekly-review" || pathname.startsWith("/weekly-review/");
  if (item.id === "assistant") return pathname === "/assistant" || pathname.startsWith("/assistant/");
  if (item.id === "settings") {
    return pathname === "/settings";
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, pathname, settingsSection, onClose }) {
  return (
    <Link
      href={item.href}
      className={`sidebar-nav-item${isNavActive(pathname, item, settingsSection) ? " active" : ""}${item.className ? ` ${item.className}` : ""}`}
      onClick={onClose}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

function NavLabel({ text, className = "" }) {
  return <div className={`sidebar-nav-label${className ? ` ${className}` : ""}`}>{text}</div>;
}

function Sidebar({ pathname, settingsSection, open, onClose, userEmail, mainItems, founderItems, showFounderSection }) {
  return (
    <>
      <div className={`sidebar-overlay${open ? " visible" : ""}`} onClick={onClose} />
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-brand">
          <img src="/brand/loop-wordmark-sidebar.png" alt="Libertrade Loop" className="sidebar-brand-logo" />
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-nav-main">
            {mainItems.map((item, i) =>
              item.type === "label" ? (
                <NavLabel key={`label-${i}`} text={item.text} className={item.className} />
              ) : (
                <NavLink key={item.id} item={item} pathname={pathname} settingsSection={settingsSection} onClose={onClose} />
              )
            )}
          </div>
          {showFounderSection && (
            <div className="sidebar-nav-bottom">
              <NavLabel text="Founder" className="sidebar-nav-label--founder" />
              {founderItems.map((item) => (
                <NavLink key={item.id} item={item} pathname={pathname} settingsSection={settingsSection} onClose={onClose} />
              ))}
            </div>
          )}
        </nav>
        <div className="sidebar-footer">
          {userEmail && (
            <div className="sidebar-footer-email" title={userEmail}>
              {userEmail}
            </div>
          )}
          <form action="/auth/logout" method="post">
            <button type="submit" className="sidebar-logout-btn">
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

function AppShellInner({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const settingsSection = pathname === "/settings" ? searchParams.get("section") : null;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState(null);
  const [isFounder, setIsFounder] = useState(false);

  const { mainItems, founderItems, showFounderSection } = useMemo(() => {
    const founder = filterNavItems(FOUNDER_NAV_ITEMS, { isFounder });
    return {
      mainItems: filterNavItems(NAV_ITEMS, { isFounder }),
      founderItems: founder,
      showFounderSection: isFounder && founder.length > 0,
    };
  }, [isFounder]);

  useEffect(() => {
    loadTraderSettings().catch(() => {});
    loadTraderProfile().catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      try {
        const user = await getCurrentUser();
        if (cancelled) return;
        setUserEmail(user?.email ?? null);

        if (!user) return;

        let founder = false;
        let serverAuthOk = false;

        try {
          const res = await fetch("/api/auth/founder-migrate", { method: "POST" });
          const data = await res.json().catch(() => null);
          if (typeof data?.isFounder === "boolean") {
            founder = !!data.isFounder;
            if (!cancelled) setIsFounder(founder);
            if (founder) {
              await ensureFounderProfile();
            }
          }
          if (res.ok) serverAuthOk = true;
        } catch {
          /* dev / offline — continue without server auth */
        }

        if (serverAuthOk) {
          try {
            const profile = await loadTraderProfile({ force: true });
            if (!cancelled && !isOnboardingComplete(profile) && !founder) {
              router.replace("/onboarding");
            }
          } catch {
            /* profile unavailable — show app anyway */
          }
        }
      } catch {
        /* dev / offline — continue without server auth */
      }
    }

    initAuth();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="app-layout">
      <style>{`
        input[type="range"] { -webkit-appearance: none; appearance: none; }
        input[type="range"]:not(.pm-slider)::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: #fff; cursor: pointer; border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
        input[type="number"] { -moz-appearance: textfield; }
        input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <button className="sidebar-toggle" onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle menu">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h12M3 9h12M3 13h12"/></svg>
      </button>

      <Sidebar
        pathname={pathname}
        settingsSection={settingsSection}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={userEmail}
        mainItems={mainItems}
        founderItems={founderItems}
        showFounderSection={showFounderSection}
      />

      <main className="main-content">{children}</main>
    </div>
  );
}

export default function AppShell({ children }) {
  return (
    <Suspense fallback={<div className="pm-loading">Loading...</div>}>
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}
