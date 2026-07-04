"use client";

import { calcPerformanceScore, performanceScoreMeta } from "../../lib/analytics-score";

const ARC_LEN = Math.PI * 80;

export default function PerformanceScoreCard({ stats, onViewInsights }) {
  const score = calcPerformanceScore(stats);
  const meta = performanceScoreMeta(score);
  const progress = score == null ? 0 : (score / 100) * ARC_LEN;

  return (
    <section className="an-card an-score-card">
      <div className="an-card-title">Performance Score</div>
      <div className="an-gauge-wrap">
        <svg viewBox="0 0 210 128" aria-hidden="true">
          <defs>
            <linearGradient id="anGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0065bd" />
              <stop offset="100%" stopColor="#50a0ff" />
            </linearGradient>
          </defs>
          <path
            d="M 25 110 A 80 80 0 0 1 185 110"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M 25 110 A 80 80 0 0 1 185 110"
            fill="none"
            stroke="url(#anGaugeGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${progress.toFixed(2)} ${ARC_LEN.toFixed(2)}`}
          />
        </svg>
        <div className="an-gauge-center">
          <div className="an-gauge-score">
            {score == null ? "—" : score} <span>/ 100</span>
          </div>
        </div>
      </div>
      <div className={`an-status-pill an-status-pill--${meta.tone}`}>{meta.label}</div>
      <p className="an-score-desc">{meta.desc}</p>
      {onViewInsights ? (
        <button type="button" className="an-btn-outline" onClick={onViewInsights}>
          View Insights
        </button>
      ) : null}
    </section>
  );
}
