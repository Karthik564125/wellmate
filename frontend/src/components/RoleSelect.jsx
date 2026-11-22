// Dropdown for choosing a role; options default to the full ROLES list
// (demo mode) but can be narrowed, e.g. to SELF_REGISTERABLE_ROLES for a real
// sign-up form where only some roles can be chosen directly.
import { ROLES } from '../data/mockData.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

// Role <select>; value is a role id and onChange receives the newly chosen id.
export function RoleSelect({ value, onChange, roles = ROLES }) {
  const { t } = useTranslation();
  return (
    <select
      className="select"
      aria-label={t('dashboard.viewingAs')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {t(role.labelKey)}
        </option>
      ))}
    </select>
  );
}
