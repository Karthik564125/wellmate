// Shared list page used by the feature pages and dashboards: a translated header plus a Card listing mock records.
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { StatCard } from '../components/StatCard.jsx';

// Pick the most readable text field from a mock record, falling back to its id.
function labelOf(item) {
  return item.name || item.title || item.label || item.id;
}

// Renders a translated page header, an optional row of stat cards, and a Card with one row per mock item.
// Props: titleKey (translation key for the page and card title), items (array of mock records), stats (optional array of { value, label } objects).
export function ModulePage({ titleKey, items, stats = [] }) {
  // Translation helper for the header and card title.
  const { t } = useTranslation();
  const title = t(titleKey);

  return (
    <div className="module-page">
      {/* Page header with the translated section name */}
      <SectionHeader title={title} />

      {/* Optional summary counts shown above the list */}
      {stats.length > 0 && (
        <div className="stat-grid">
          {stats.map((stat) => (
            <StatCard key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </div>
      )}

      {/* Card listing the mock records for this section */}
      <Card title={title}>
        <ul className="module-list">
          {items.map((item) => (
            <li key={item.id} className="module-list__item">
              <span className="module-list__label">{labelOf(item)}</span>
              {item.relation && <span className="module-list__meta">{item.relation}</span>}
              {item.time && <span className="module-list__meta">{item.time}</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
