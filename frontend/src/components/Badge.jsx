// Small pill used for status labels; the tone sets its colour.

// Status pill with tone one of success, warning, danger, info or neutral.
export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
