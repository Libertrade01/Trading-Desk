export default function HabitTileField({ label, hint, value, onChange }) {
  return (
    <button
      type="button"
      className={`pm-habit-tile${value ? " on" : ""}`}
      onClick={() => onChange(!value)}
      aria-pressed={value}
    >
      <span className="pm-habit-tile-mark" aria-hidden="true">
        {value ? "✓" : ""}
      </span>
      <span className="pm-habit-tile-copy">
        <span className="pm-habit-tile-title">{label}</span>
        {hint && <span className="pm-habit-tile-hint">{hint}</span>}
      </span>
    </button>
  );
}
