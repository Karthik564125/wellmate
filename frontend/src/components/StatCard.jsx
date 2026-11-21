// Summary stat tile matching the design of family-care-hub.html with Newsreader serif numbers and colored left accents.

// Stat tile: renders value in Newsreader serif (.n), label, and sublabel (.mut).
export function StatCard({ value, label, tone = 'info', sublabel, onClick }) {
  // Tone mapping for the left border accent: danger -> b, warning -> w, success -> o, default -> teal brand
  const toneClass = tone === 'danger' ? 'b' : tone === 'warning' ? 'w' : tone === 'success' ? 'o' : '';

  return (
    <div className={`card stat ${toneClass}`.trim()} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="n">{value}</div>
      <div className="stat__label">{label}</div>
      {sublabel && <div className="mut">{sublabel}</div>}
    </div>
  );
}
