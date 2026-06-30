"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "analytics-workflow-notice-dismissed";

export default function AnalyticsWorkflowNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(STORAGE_KEY));
  }, []);

  if (!visible) return null;

  return (
    <div className="analytics-desk-notice analytics-desk-notice--compact">
      <span className="hybrid-eyebrow">Workflow</span>
      <p>
        Import in <Link href="/postmarket">Close loop</Link> · tag every setup · accounts in{" "}
        <Link href="/settings">Settings</Link>.
      </p>
      <button
        type="button"
        className="analytics-desk-notice__dismiss"
        onClick={() => {
          localStorage.setItem(STORAGE_KEY, "1");
          setVisible(false);
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
