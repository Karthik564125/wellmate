// Sign-in page: validates email and password inline, then runs a demo login that sets the role and opens its dashboard.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { RoleSelect } from '../components/RoleSelect.jsx';
import { AuthLayout } from './AuthLayout.jsx';

// Simple email shape check: something@something.tld with no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign-in form page; errors are shown next to each field after a submit attempt.
export function SignInPage() {
  // Translation helper for all visible text.
  const { t } = useTranslation();
  // Current role from context, plus setter used by the demo login.
  const { role, setRole } = useRole();
  // Router navigate function for redirecting after login.
  const navigate = useNavigate();

  // Form field state.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(role);
  // Whether the password text is visible.
  const [showPassword, setShowPassword] = useState(false);
  // Inline error messages keyed by field name.
  const [errors, setErrors] = useState({});

  // Check the fields and return an object of translated error messages (empty when valid).
  function validate() {
    const next = {};
    if (!email.trim()) next.email = t('auth.validation.emailRequired');
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = t('auth.validation.emailInvalid');
    if (!password) next.password = t('auth.validation.passwordRequired');
    return next;
  }

  // Handle submit: validate, then set the chosen role and go to its dashboard.
  function handleSubmit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setRole(selectedRole);
    navigate(`/dashboard/${selectedRole}`);
  }

  return (
    <AuthLayout
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <p>
          {t('auth.noAccount')} <Link to="/signup">{t('auth.signUp')}</Link>
        </p>
      }
    >
      {/* Demo notice explaining sign-in is not connected yet */}
      <p className="auth-demo-note">{t('auth.demoNote')}</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {/* Email field */}
        <label className="field">
          <span>{t('auth.email')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
          />
          {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
        </label>

        {/* Password field with show/hide toggle */}
        <label className="field">
          <span>{t('auth.password')}</span>
          <div className="field-password">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="field-toggle"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((previous) => !previous)}
            >
              {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            </button>
          </div>
          {errors.password && <span className="field-error" role="alert">{errors.password}</span>}
        </label>

        {/* Role chooser for the demo login */}
        <label className="field">
          <span>{t('auth.role')}</span>
          <RoleSelect value={selectedRole} onChange={setSelectedRole} />
        </label>

        <button type="submit" className="btn btn--primary btn--block">
          {t('auth.signIn')}
        </button>
      </form>
    </AuthLayout>
  );
}
