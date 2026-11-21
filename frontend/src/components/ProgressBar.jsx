// Horizontal progress indicator with an optional label and percentage.

// Clamp a number to the 0–100 range so the bar never overflows.
function clampPercent(value) {
  const number = Number(value) || 0;
  return Math.min(100, Math.max(0, number));
}

// Accessible progress bar; value is 0–100 and tone colours the fill.
export function ProgressBar({ value = 0, tone = 'info', label }) {
  const percent = clampPercent(value);
  return (
    <div className={`progress progress--${tone}`}>
      {label && (
        <div className="progress__head">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
      >
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
