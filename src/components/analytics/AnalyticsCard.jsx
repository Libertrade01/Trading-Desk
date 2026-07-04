export default function AnalyticsCard({ title, action, children, className = "" }) {
  return (
    <div className={`an-card analytics-card ${className}`.trim()}>
      {(title || action) && (
        <div className="an-card-head analytics-card__head">
          {title ? <div className="an-card-title analytics-card__title">{title}</div> : <span />}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
