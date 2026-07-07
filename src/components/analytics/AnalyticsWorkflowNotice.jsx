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
      <p>
        <span className="hybrid-eyebrow analytics-desk-notice__eyebrow">Workflow ·</span>{" "}
        Import broker CSV or add manually each session in{" "}
        <Link href="/postmarket">Close the LOOP</Link> and tag playbook setups. Configure{" "}
        <Link href="/settings?section=process">My Process</Link> in Settings.
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
