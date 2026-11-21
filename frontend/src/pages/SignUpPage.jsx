// Sign-up page: collects name, email, phone, password, confirmation and role, validates inline, then runs a demo sign-up.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useRole } from '../context/RoleContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { RoleSelect } from '../components/RoleSelect.jsx';
import { AuthLayout } from './AuthLayout.jsx';

// Simple email shape check: something@something.tld with no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Phone check: optional leading +, then 7 to 15 digits, spaces or dashes.
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,14}$/;
// Minimum password length accepted by the demo.
const MIN_PASSWORD_LENGTH = 6;

// Sign-up form page; on success it sets the chosen role, shows a toast and opens that role's dashboard.
export function SignUpPage() {
  // Translation helper for all visible text.
  const { t } = useTranslation();
  // Current role from context, plus setter used by the demo sign-up.
  const { role, setRole } = useRole();
  // Toast helper for the success message.
  const { show } = useToast();
  // Router navigate function for redirecting after sign-up.
  const navigate = useNavigate();

  // Form field state.
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role,
  });
  // Inline error messages keyed by field name.
  const [errors, setErrors] = useState({});

  // Update one field in the form state.
  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  // Check every field and return an object of translated error messages (empty when valid).
  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = t('auth.validation.nameRequired');
    if (!form.email.trim()) next.email = t('auth.validation.emailRequired');
    else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = t('auth.validation.emailInvalid');
    if (!form.phone.trim()) next.phone = t('auth.validation.phoneInvalid');
    else if (!PHONE_PATTERN.test(form.phone.trim())) next.phone = t('auth.validation.phoneInvalid');
    if (!form.password) next.password = t('auth.validation.passwordRequired');
    else if (form.password.length < MIN_PASSWORD_LENGTH) next.password = t('auth.validation.passwordTooShort');
    if (form.confirmPassword !== form.password) next.confirmPassword = t('auth.validation.passwordMismatch');
    if (!form.role) next.role = t('auth.validation.roleRequired');
    return next;
  }

  // Handle submit: validate, then set the role, show a success toast and navigate to the dashboard.
  function handleSubmit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setRole(form.role);
    show(t('auth.signUpSuccess'), 'success');
    navigate(`/dashboard/${form.role}`);
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

  return (
    <AuthLayout
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpSubtitle')}
      footer={
        <p>
          {t('auth.haveAccount')} <Link to="/signin">{t('auth.signIn')}</Link>
        </p>
      }
    >
      {/* Demo notice explaining sign-up is not connected yet */}
      <p className="auth-demo-note">{t('auth.demoNote')}</p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {renderInput('name', t('auth.name'), 'text', 'name')}
        {renderInput('email', t('auth.email'), 'email', 'email')}
        {renderInput('phone', t('auth.phone'), 'tel', 'tel')}
        {renderInput('password', t('auth.password'), 'password', 'new-password')}
        {renderInput('confirmPassword', t('auth.confirmPassword'), 'password', 'new-password')}

        {/* Role chooser; the selection decides which dashboard opens after sign-up */}
        <label className="field">
          <span>{t('auth.role')}</span>
          <RoleSelect value={form.role} onChange={(value) => updateField('role', value)} />
          {errors.role && <span className="field-error" role="alert">{errors.role}</span>}
        </label>

        <button type="submit" className="btn btn--primary btn--block">
          {t('auth.signUp')}
        </button>
      </form>
    </AuthLayout>
  );
}
