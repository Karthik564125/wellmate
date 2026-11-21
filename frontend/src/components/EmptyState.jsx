// Placeholder shown when a list or section has nothing to display.

// Centred title and message for empty lists; copy is passed in already translated.
export function EmptyState({ title, message }) {
  return (
    <div className="empty-state" role="status">
      <h3 className="empty-state__title">{title}</h3>
      {message && <p>{message}</p>}
    </div>
  );
}
