export default function AnalyticsStat({ label, value, tone = "neutral", size, sub, className = "" }) {
  const sizeClass = size === "sm" ? " an-stat__value--sm" : "";
  return (
    <div className={`an-stat ${className}`.trim()}>
      {label ? <div className="an-stat__label">{label}</div> : null}
      <div className={`an-stat__value ${tone}${sizeClass}`}>{value}</div>
      {sub ? <div className="an-stat__sub">{sub}</div> : null}
    </div>
  );
}
