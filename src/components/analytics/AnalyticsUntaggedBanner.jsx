"use client";

import Link from "next/link";

export default function AnalyticsUntaggedBanner({ untaggedCount, onTagTrade }) {
  if (!untaggedCount) return null;

  return (
    <div className="analytics-desk-notice analytics-desk-notice--compact analytics-untagged-banner">
      <p>
        {untaggedCount} trade{untaggedCount === 1 ? "" : "s"} in range still need setup tags — playbook
        adherence requires every trade tagged.
      </p>
      <div className="analytics-untagged-banner__actions">
        {onTagTrade ? (
          <button type="button" className="analytics-link-btn" onClick={onTagTrade}>
            Tag now
          </button>
        ) : null}
        <Link href="/postmarket" className="analytics-link-btn">
          Close out
        </Link>
      </div>
    </div>
  );
}
