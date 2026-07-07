"use client";

import { useId, useMemo } from "react";

const R = 46;
const C = 2 * Math.PI * R;
const GAP = 9;
const STROKE = 9.5;

function segmentLengths(counts) {
  const active = counts.filter((s) => s.count > 0);
  if (!active.length) return [];

  const total = active.reduce((sum, s) => sum + s.count, 0);
  const usable = Math.max(C - active.length * GAP, 0);
  let offset = 0;

  return active.map((seg) => {
    const len = (seg.count / total) * usable;
    const item = {
      ...seg,
      len,
      offset,
      dasharray: `${len.toFixed(2)} ${(C - len).toFixed(2)}`,
      dashoffset: (-offset).toFixed(2),
    };
    offset += len + GAP;
    return item;
  });
}

export default function OutcomesDonut({ winners = 0, breakeven = 0, losers = 0, compact = false }) {
  const uid = useId().replace(/:/g, "");
  const total = winners + breakeven + losers;

  const segments = useMemo(() => {
    const counts = [
      { key: "winners", label: "Winners", count: winners, grad: `donutWinGrad-${uid}` },
      { key: "breakeven", label: "Breakeven", count: breakeven, grad: `donutBeGrad-${uid}` },
      { key: "losers", label: "Losers", count: losers, grad: `donutLoseGrad-${uid}` },
    ];
    return segmentLengths(counts);
  }, [winners, breakeven, losers, uid]);

  const legend = [
    { key: "winners", label: "Winners", count: winners },
    { key: "breakeven", label: "Breakeven", count: breakeven },
    { key: "losers", label: "Losers", count: losers },
  ];

  if (compact) {
    return (
      <article className="an-card an-metric-card an-outcomes-compact">
        <div className="an-metric-label">Outcomes</div>
        <div className="an-outcomes-compact-body">
          <div className="an-donut-wrap an-donut-wrap--compact">
            <svg viewBox="0 0 124 124" aria-hidden="true">
              <defs>
                <linearGradient id={`donutWinGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7ab8ff" />
                  <stop offset="55%" stopColor="#50a0ff" />
                  <stop offset="100%" stopColor="#2f7fd4" />
                </linearGradient>
                <linearGradient id={`donutBeGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b929c" />
                  <stop offset="55%" stopColor="#6b7280" />
                  <stop offset="100%" stopColor="#4b5563" />
                </linearGradient>
                <linearGradient id={`donutLoseGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f5a39c" />
                  <stop offset="55%" stopColor="#f07167" />
                  <stop offset="100%" stopColor="#c85a52" />
                </linearGradient>
              </defs>
              <circle cx="62" cy="62" r={R} fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="12" />
              {segments.length
                ? segments.map((seg) => (
                    <circle
                      key={seg.key}
                      cx="62"
                      cy="62"
                      r={R}
                      fill="none"
                      stroke={`url(#${seg.grad})`}
                      strokeWidth={STROKE}
                      strokeLinecap="round"
                      strokeDasharray={seg.dasharray}
                      strokeDashoffset={seg.dashoffset}
                    />
                  ))
                : null}
            </svg>
            <div className="an-donut-center">
              <div>
                <strong>{total}</strong>
              </div>
            </div>
          </div>
          <div className="an-legend an-legend--compact">
            {legend.map((item) => {
              const pct = total ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.key} className="an-legend-item an-legend-item--compact">
                  <span className={`an-legend-dot an-legend-dot--${item.key}`} />
                  <span className="an-legend-value">
                    {item.count} <em>({pct}%)</em>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </article>
    );
  }

  return (
    <section className="an-card an-outcomes-card">
      <div className="an-card-title">Outcomes Breakdown</div>
      <div className="an-donut-row">
        <div className="an-donut-wrap">
          <svg viewBox="0 0 124 124" aria-hidden="true">
            <defs>
              <linearGradient id={`donutWinGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7ab8ff" />
                <stop offset="55%" stopColor="#50a0ff" />
                <stop offset="100%" stopColor="#2f7fd4" />
              </linearGradient>
              <linearGradient id={`donutBeGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b929c" />
                <stop offset="55%" stopColor="#6b7280" />
                <stop offset="100%" stopColor="#4b5563" />
              </linearGradient>
              <linearGradient id={`donutLoseGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f5a39c" />
                <stop offset="55%" stopColor="#f07167" />
                <stop offset="100%" stopColor="#c85a52" />
              </linearGradient>
              <filter id={`donutSegGlow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle
              cx="62"
              cy="62"
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.055)"
              strokeWidth="12"
            />
            <circle
              cx="62"
              cy="62"
              r={R}
              fill="none"
              stroke="rgba(80,160,255,0.16)"
              strokeWidth="14"
              opacity="0.55"
            />
            <circle
              cx="62"
              cy="62"
              r="39.5"
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />

            {segments.length ? (
              <g filter={`url(#donutSegGlow-${uid})`}>
                {segments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="62"
                    cy="62"
                    r={R}
                    fill="none"
                    stroke={`url(#${seg.grad})`}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={seg.dasharray}
                    strokeDashoffset={seg.dashoffset}
                  />
                ))}
              </g>
            ) : null}

            <circle
              cx="62"
              cy="62"
              r="51.5"
              fill="none"
              stroke="rgba(255,255,255,0.045)"
              strokeWidth="1"
            />
          </svg>
          <div className="an-donut-center">
            <div>
              <strong>{total}</strong>
              <span>Trades</span>
            </div>
          </div>
        </div>

        <div className="an-legend">
          {legend.map((item) => {
            const pct = total ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.key} className="an-legend-item">
                <span className={`an-legend-dot an-legend-dot--${item.key}`} />
                <span className="an-legend-label">{item.label}</span>
                <span className="an-legend-value">
                  {item.count} <em>({pct}%)</em>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
