"use client";

import { JOURNAL_REVIEW_CHECKLIST } from "../../lib/postmarket-defaults";

/** Subtle REPLAY / Database status pills for history list rows. */
export default function HistoryJournalIndicators({ session }) {
  const post = session?.post;
  if (!session?.hasPost || post?.noTradeToday) return null;

  return (
    <div className="history-journal-micro" aria-label="Close-out checklist">
      {JOURNAL_REVIEW_CHECKLIST.map((item) => {
        const done = !!post?.[item.key];
        return (
          <span
            key={item.key}
            className={`history-journal-micro__pill${done ? " done" : " pending"}`}
            title={`${item.statusLabel}: ${done ? "Done" : "Pending"}`}
          >
            {done && (
              <svg
                className="history-journal-micro__check"
                width="8"
                height="8"
                viewBox="0 0 8 8"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1.5 4L3.2 5.7L6.5 2.3"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {item.statusLabel}
          </span>
        );
      })}
    </div>
  );
}
