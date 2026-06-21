export default function AnalyticsCard({ title, action, children, className = "" }) {
  return (
    <div className={`analytics-card ${className}`.trim()}>
      {(title || action) && (
        <div className="analytics-card__head">
          {title ? <div className="analytics-card__title">{title}</div> : <span />}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
