// Timeline component: vertical chronological list of health, visit and medicine events with SVG icons.

// SVG icon for timeline item based on its category (appointment, prescription, report).
function TimelineIcon({ type }) {
  switch (type) {
    case 'appointment':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'prescription':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.5 20.5l10-10a4.95 4.95 0 10-7-7l-10 10a4.95 4.95 0 107 7z" />
          <path d="M8.5 8.5l7 7" />
        </svg>
      );
    case 'report':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
  }
}

// Renders an ordered vertical list of dated timeline events.
export function Timeline({ items = [] }) {
  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.id} className={`timeline__item${item.upcoming ? ' timeline__item--upcoming' : ''}`}>
          <span className={`timeline__icon timeline__icon--${item.type}`} aria-hidden="true">
            <TimelineIcon type={item.type} />
          </span>
          <div className="timeline__body">
            <p className="timeline__date">{item.date}</p>
            <p className="timeline__title">{item.title}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
