// Sign-in page: real Firebase email/password sign-in, routed to the correct
// dashboard by the backend's own record of the account's role. A separate
// "continue in demo mode" path below it skips auth entirely and stays
// exactly as it always has, for exploring any dashboard with sample data.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { ApiError, api } from '../api/client.js';
import { RoleSelect } from '../components/RoleSelect.jsx';
import { AuthLayout } from './AuthLayout.jsx';

// Simple email shape check: something@something.tld with no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign-in form page; errors are shown next to each field after a submit attempt.
export function SignInPage() {
  // Translation helper for all visible text.
  const { t } = useTranslation();
  // Current role from context, plus setter used after a real or demo sign-in.
  const { role, setRole } = useRole();
  // Real Firebase sign-in, from the auth context.
  const { signInWithEmail } = useAuth();
  // Router navigate function for redirecting after sign-in.
  const navigate = useNavigate();

  // Real sign-in form field state.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Whether the password text is visible.
  const [showPassword, setShowPassword] = useState(false);
  // Inline error messages keyed by field name ("form" for a general failure).
  const [errors, setErrors] = useState({});
  // True while a real sign-in request is in flight.
  const [submitting, setSubmitting] = useState(false);

  // Demo-mode role chooser; independent of the real sign-in form above it.
  const [demoRole, setDemoRole] = useState(role);

  // Check the fields and return an object of translated error messages (empty when valid).
  function validate() {
    const next = {};
    if (!email.trim()) next.email = t('auth.validation.emailRequired');
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = t('auth.validation.emailInvalid');
    if (!password) next.password = t('auth.validation.passwordRequired');
    return next;
  }

  // Handle the real sign-in: Firebase first, then ask the backend who this
  // account actually is (role, linked elders) and route accordingly.
  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
      const me = await api.get('/me');
      setRole(me.user.role);
      navigate(`/dashboard/${me.user.role}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Signed in to Firebase, but no backend User exists for this account yet.
        setErrors({ form: t('auth.noAccountFound') });
      } else {
        setErrors({ form: t('auth.signInFailed') });
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

        {errors.form && (
          <p className="field-error" role="alert">
            {errors.form}
          </p>
        )}

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? t('auth.signingIn') : t('auth.signIn')}
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
