"use client";

import { sliderValueColor } from "../lib/premarket-scoring";

function fillPercent(value, min, max) {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * 100;
}

export default function SliderField({
  label,
  hint,
  minLabel,
  maxLabel,
  value,
  onChange,
  inverted,
  min = 1,
  max = 10,
}) {
  return (
    <div className="pm-field">
      <div className="pm-field-top">
        <div>
          <div className="pm-field-label hybrid-label">{label}</div>
          {hint && <div className="pm-field-hint">{hint}</div>}
        </div>
        <div className="pm-field-value" style={{ color: sliderValueColor(value, inverted) }}>
          {value}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pm-slider"
        style={{ "--pm-slider-fill": `${fillPercent(value, min, max)}%` }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      />
      <div className="pm-slider-labels">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
