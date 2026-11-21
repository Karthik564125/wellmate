// Dropdown for choosing the active role; options come from ROLES and are translated.
import { ROLES } from '../data/mockData.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

// Role <select>; value is a role id and onChange receives the newly chosen id.
export function RoleSelect({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <select
      className="select"
      aria-label={t('dashboard.viewingAs')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {ROLES.map((role) => (
        <option key={role.id} value={role.id}>
          {t(role.labelKey)}
        </option>
      ))}
    </select>
  );
}
