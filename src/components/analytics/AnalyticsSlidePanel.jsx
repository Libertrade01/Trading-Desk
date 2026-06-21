"use client";

import { useEffect } from "react";

export default function AnalyticsSlidePanel({ open, title, onClose, children, width = "min(640px, 92vw)" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="analytics-slide-overlay" onClick={onClose} aria-hidden="true" />
      <aside
        className="analytics-slide-panel"
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="analytics-slide-panel__head">
          <h2 className="analytics-slide-panel__title">{title}</h2>
          <button type="button" className="analytics-slide-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="analytics-slide-panel__body">{children}</div>
      </aside>
    </>
  );
}
