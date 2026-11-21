// Circular avatar that shows up to two initials derived from a person's name.

// Build initials from the first letters of up to two name parts.
function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// Renders initials on a tone-coloured circle; size is sm, md or lg.
export function Avatar({ name = '', tone = 'teal', size = 'md' }) {
  // Keep the full name available to assistive tech since only initials are visible.
  return (
    <span className={`avatar avatar--${tone} avatar--${size}`} role="img" aria-label={name}>
      {getInitials(name)}
    </span>
  );
}
