// Sign-up page: real Firebase account creation plus backend registration,
// restricted to the roles that can actually self-register (elder/family -
// volunteer/caretaker are invite-only, see SELF_REGISTERABLE_ROLES). A
// separate "continue in demo mode" path below it skips all of this, exactly
// as before, for exploring any dashboard with sample data.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { ApiError, api } from '../api/client.js';
import { RoleSelect } from '../components/RoleSelect.jsx';
import { SELF_REGISTERABLE_ROLES } from '../data/mockData.js';
import { AuthLayout } from './AuthLayout.jsx';
import familyPhoto from '../assets/11.png';

// Simple email shape check: something@something.tld with no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Minimum password length Firebase (and this form) accepts.
const MIN_PASSWORD_LENGTH = 6;

// Default to the role the demo picker was last set to, if it's actually one
// that can self-register; otherwise fall back to "family".
function initialSelfRegisterRole(contextRole) {
  return SELF_REGISTERABLE_ROLES.some((r) => r.id === contextRole) ? contextRole : 'family';
}

export function SignUpPage() {
  const { t } = useTranslation();
  const { role, setRole } = useRole();
  const { signUpWithEmail } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  // Real sign-up form state.
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: initialSelfRegisterRole(role),
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Demo-mode role chooser (any of the five roles); independent of the real form above it.
  const [demoRole, setDemoRole] = useState(role);

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = t('auth.validation.nameRequired');
    if (!form.email.trim()) next.email = t('auth.validation.emailRequired');
    else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = t('auth.validation.emailInvalid');

    if (!form.password) next.password = t('auth.validation.passwordRequired');
    else if (form.password.length < MIN_PASSWORD_LENGTH) next.password = t('auth.validation.passwordTooShort');
    if (form.confirmPassword !== form.password) next.confirmPassword = t('auth.validation.passwordMismatch');
    if (!form.role) next.role = t('auth.validation.roleRequired');
    return next;
  }

  // Real sign-up: create the Firebase account, then register the matching
  // backend User with the chosen role (elder/family only).
  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signUpWithEmail(form.email.trim(), form.password);
      const { user } = await api.post('/auth/register', {
        name: form.name.trim(),
        role: form.role,

        email: form.email.trim(),
      });
      setRole(user.role);
      show(t('auth.signUpSuccess'), 'success');
      navigate(`/dashboard/${user.role}`);
    } catch (err) {
      if (err?.code === 'auth/email-already-in-use') {
        setErrors({ email: t('auth.emailInUse') });
      } else if (err instanceof ApiError) {
        setErrors({ form: t('auth.signUpFailed') });
      } else {
        setErrors({ form: t('auth.signUpFailed') });
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Demo mode: no Firebase, no backend call - exactly the previous behavior.
  function handleDemoMode(event) {
    event.preventDefault();
    setRole(demoRole);
    navigate(`/dashboard/${demoRole}`);
  }

  // Eye icon SVGs — open (visible) and closed (hidden).
  function EyeIcon({ open }) {
    return open ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    );
  }

  // Shared markup for one labelled text input with its inline error.
  function renderInput(field, label, type = 'text', autoComplete = 'off') {
    return (
      <label className="field">
        <span>{label}</span>
        <input
          type={type}
          value={form[field]}
          onChange={(e) => updateField(field, e.target.value)}
          aria-invalid={Boolean(errors[field])}
          autoComplete={autoComplete}
        />
        {errors[field] && <span className="field-error" role="alert">{errors[field]}</span>}
      </label>
    );
  }

  // Password field with show/hide toggle icon button.
  function renderPasswordInput(field, label, show, setShow, autoComplete = 'new-password') {
    return (
      <label className="field">
        <span>{label}</span>
        <div className="field-password">
          <input
            type={show ? 'text' : 'password'}
            value={form[field]}
            onChange={(e) => updateField(field, e.target.value)}
            aria-invalid={Boolean(errors[field])}
            autoComplete={autoComplete}
          />
          <button
            type="button"
            className="field-toggle"
            onClick={() => setShow((prev) => !prev)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            <EyeIcon open={show} />
          </button>
        </div>
        {errors[field] && <span className="field-error" role="alert">{errors[field]}</span>}
      </label>
    );
  }

  return (
    <AuthLayout
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpSubtitle')}
      image={familyPhoto}
      imageAlt={t('auth.imageAlt.signUp')}
      footer={
        <p>
          {t('auth.haveAccount')} <Link to="/signin">{t('auth.signIn')}</Link>
        </p>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {renderInput('name', t('auth.name'), 'text', 'name')}
        {renderInput('email', t('auth.email'), 'email', 'email')}

        {renderPasswordInput('password', t('auth.password'), showPassword, setShowPassword)}
        {renderPasswordInput('confirmPassword', t('auth.confirmPassword'), showConfirmPassword, setShowConfirmPassword)}

        {/* Only elder/family here: volunteer/caretaker are invite-only. */}
        <label className="field">
          <span>{t('auth.role')}</span>
          <RoleSelect
            value={form.role}
            onChange={(value) => updateField('role', value)}
            roles={SELF_REGISTERABLE_ROLES}
          />
          <span className="auth-demo-note" style={{ marginTop: 8 }}>
            {t('auth.selfRegisterRoleHint')}
          </span>
          {errors.role && <span className="field-error" role="alert">{errors.role}</span>}
        </label>

        {errors.form && (
          <p className="field-error" role="alert">
            {errors.form}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? t('auth.creatingAccount') : t('auth.signUp')}
        </button>
      </form>

      <div className="auth-divider">{t('auth.orDivider')}</div>

      <div className="auth-demo">
        <p className="auth-demo-note">{t('auth.demoNote')}</p>
        <label className="field">
          <span>{t('auth.role')}</span>
          <RoleSelect value={demoRole} onChange={setDemoRole} />
        </label>
        <button type="button" className="btn btn-secondary btn--block" onClick={handleDemoMode}>
          {t('auth.continueDemoMode')}
        </button>
      </div>
    </AuthLayout>
  );
}
