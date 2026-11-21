// Reusable Card container: header with optional title and action controls, wrapping arbitrary content.

// Card wrapper: renders a structured card surface with support for header and custom element properties.
export function Card({ title, action, children, className = '', ...props }) {
  return (
    <section className={`card ${className}`.trim()} {...props}>
      {(title || action) && (
        <div className="card__header">
          {title && <h2 className="card__title">{title}</h2>}
          {action && <div className="card__action">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
