// Heading row for a page section, with an optional subtitle and right-aligned action.

// Section title, optional subtitle, and optional action element on the right.
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-header__title">{title}</h2>
        {subtitle && <p className="section-header__subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
