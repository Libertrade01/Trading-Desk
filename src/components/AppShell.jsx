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

const NAV_ITEMS = [
  { id: "home", href: "/", label: "Home", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="0.5"/><rect x="9" y="2" width="5" height="5" rx="0.5"/><rect x="2" y="9" width="5" height="5" rx="0.5"/><rect x="9" y="9" width="5" height="5" rx="0.5"/></svg>
  )},
  { type: "label", text: "Daily", className: "sidebar-nav-label--daily" },
  { id: "premarket", href: "/premarket", label: "Check-in", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>
  )},
  { id: "dailyplan", href: "/plan", label: "Session Plan", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5" strokeLinecap="round"/></svg>
  )},
  { id: "postmarket", href: "/postmarket", label: "Close loop", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12h12M4 9l3-3 2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )},
  { id: "history", href: "/history", label: "History", className: "sidebar-nav-item--daily-gap", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4.5v4l2.5 1.5" strokeLinecap="round"/></svg>
  )},
  { type: "label", text: "Reference" },
  { id: "process", href: "/settings?section=process", label: "My process", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3.5h10v9H3z"/><path d="M5.5 6.5h5M5.5 9h3.5" strokeLinecap="round"/></svg>
  )},
  { id: "weeklyreview", href: "/weekly-review", label: "Weekly Review", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="1"/><path d="M2 6.5h12M5 1.5v3M11 1.5v3" strokeLinecap="round"/></svg>
  )},
  { id: "propeconomics", href: "/prop-economics", label: "Prop Economics", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12V6l6-3 6 3v6l-6 3-6-3z"/><path d="M8 3v10M2 6l6 3 6-3" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )},
  { id: "analytics", href: "/analytics", label: "Analytics", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="9" width="3" height="5" rx="0.5"/><rect x="6.5" y="5" width="3" height="9" rx="0.5"/><rect x="11" y="2" width="3" height="12" rx="0.5"/></svg>
  )},
];

const FOUNDER_NAV_ITEMS = [
  { id: "desk", href: "/desk", label: "Trade Desk", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h8M2 12h10"/></svg>
  )},
  { id: "wiki", href: "/wiki", label: "Wiki", icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2.5h10v11H3z"/><path d="M5.5 2.5v11M8 2.5v11M10.5 2.5v11"/></svg>
  )},
];

const SETTINGS_NAV_ITEM = {
  id: "settings",
  href: "/settings",
  label: "Settings",
  icon: (
    <svg className="sidebar-nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/></svg>
  ),
};

function isNavActive(pathname, item, settingsSection) {
  if (item.id === "home") return pathname === "/";
  if (item.id === "history") return pathname === "/history" || pathname.startsWith("/history/");
  if (item.id === "weeklyreview") return pathname === "/weekly-review" || pathname.startsWith("/weekly-review/");
  if (item.id === "process") {
    return pathname === "/settings" && settingsSection === "process";
  }
  if (item.id === "settings") {
    return pathname === "/settings" && settingsSection !== "process";
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
          <div className="sidebar-wordmark">Liber<span>trade</span></div>
          <div className="sidebar-brand-sub">Loop</div>
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
          <div className="sidebar-nav-bottom">
            <NavLink item={SETTINGS_NAV_ITEM} pathname={pathname} settingsSection={settingsSection} onClose={onClose} />
            {showFounderSection && (
              <>
                <NavLabel text="Founder" className="sidebar-nav-label--founder" />
                {founderItems.map((item) => (
                  <NavLink key={item.id} item={item} pathname={pathname} settingsSection={settingsSection} onClose={onClose} />
                ))}
              </>
            )}
          </div>
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
          if (res.ok) {
            serverAuthOk = true;
            const data = await res.json();
            founder = !!data.isFounder;
            if (!cancelled) setIsFounder(founder);
            if (founder) {
              await ensureFounderProfile();
            }
          }
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
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: #fff; cursor: pointer; border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
        input.pm-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #a8adb8; cursor: pointer; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 1px 3px rgba(0,0,0,0.35); }
        input.pm-slider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #a8adb8; cursor: pointer; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 1px 3px rgba(0,0,0,0.35); }
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
