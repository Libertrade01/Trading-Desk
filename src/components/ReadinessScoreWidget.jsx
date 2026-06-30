"use client";

import { readinessScoreColor } from "../lib/premarket-scoring";

const RING_CONFIG = {
  full: {
    size: 140,
    viewBox: "0 0 140 140",
    cx: 70,
    cy: 70,
    r: 50,
    strokeWidth: 6,
    numY: 55,
    denomY: 86,
    numClass: "pm-score-ring-num",
    denomClass: "pm-score-ring-denom",
    ringClass: "pm-score-ring",
  },
  compact: {
    size: 88,
    viewBox: "0 0 88 88",
    cx: 44,
    cy: 44,
    r: 32,
    strokeWidth: 4,
    numY: 40,
    denomY: 56,
    numClass: "home-hybrid-readiness-num",
    denomClass: "home-hybrid-readiness-denom",
    ringClass: "home-hybrid-readiness-ring",
  },
};

export function ReadinessScoreRing({ score, variant = "full" }) {
  const cfg = RING_CONFIG[variant] ?? RING_CONFIG.full;
  const c = 2 * Math.PI * cfg.r;
  const offset = c - (score / 100) * c;
  const tone = readinessScoreColor(score);

  return (
    <svg
      width={cfg.size}
      height={cfg.size}
      viewBox={cfg.viewBox}
      className={cfg.ringClass}
      aria-hidden="true"
    >
      <circle
        cx={cfg.cx}
        cy={cfg.cy}
        r={cfg.r}
        fill="none"
        stroke={cfg.trackStroke ?? "var(--border)"}
        strokeWidth={cfg.strokeWidth}
      />
      <circle
        cx={cfg.cx}
        cy={cfg.cy}
        r={cfg.r}
        fill="none"
        stroke={tone}
        strokeWidth={cfg.strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cfg.cx} ${cfg.cy})`}
        style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.3s ease" }}
      />
      <text x={cfg.cx} textAnchor="middle">
        <tspan
          x={cfg.cx}
          y={cfg.numY}
          dominantBaseline="middle"
          className={cfg.numClass}
          style={{ fill: tone }}
        >
          {score}
        </tspan>
        {!cfg.hideDenom && (
          <tspan
            x={cfg.cx}
            y={cfg.denomY}
            dominantBaseline="middle"
            className={cfg.denomClass}
          >
            / 100
          </tspan>
        )}
      </text>
    </svg>
  );
}

export default function ReadinessScoreWidget({
  score,
  statusLabel,
  statusTone,
  variant = "full",
  className = "",
}) {
  const isCompact = variant === "compact";

  return (
    <div
      className={`readiness-score-widget readiness-score-widget--${variant}${className ? ` ${className}` : ""}`}
      aria-label={`Readiness score ${score} out of 100, ${statusLabel}`}
    >
      <div className={isCompact ? "home-hybrid-readiness-label" : "pm-score-label hybrid-label-sm"}>
        Readiness Score
      </div>
      <div className={isCompact ? "home-hybrid-readiness-ring-wrap" : "pm-score-ring-wrap"}>
        <ReadinessScoreRing score={score} variant={variant} />
      </div>
      {statusLabel && (
        <div
          className={
            isCompact
              ? `home-hybrid-readiness-status home-hybrid-readiness-status--${statusTone || "good"}`
              : `pm-score-status pm-score-status--${statusTone || "good"}`
          }
        >
          {statusLabel}
        </div>
      )}
    </div>
  );
}
