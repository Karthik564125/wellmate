// Connect Elder page: links the signed-in family (or admin) account to an
// elder by email - no separate profile form, no invite code. The elder must
// already have signed up with that email (choosing the "Elder" role); if
// they haven't, this tells the family member to ask them to do that first,
// then come back and connect again.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { ApiError } from '../api/client.js';
import { connectElderByEmail } from '../api/elders.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ConnectElderPage() {
  const { t } = useTranslation();
  const { show } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [relation, setRelation] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!email.trim()) next.email = t('pages.connectElder.errEmailRequired');
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = t('pages.connectElder.errEmailInvalid');
    if (!relation.trim()) next.relation = t('pages.connectElder.errRelation');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    connectElderByEmail({ email: email.trim().toLowerCase(), relation: relation.trim() })
      .then(() => {
        show(t('pages.connectElder.toastConnected'), 'success');
        navigate('/dashboard/family');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          // The backend's own message already says exactly what to do
          // ("ask them to sign up with this email first...").
          setErrors({ email: err.message });
        } else {
          show(err instanceof ApiError ? err.message : t('pages.connectElder.genericError'), 'danger');
        }
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="stack">
      <SectionHeader title={t('pages.connectElder.title')} subtitle={t('pages.connectElder.subtitle')} />

      <Card>
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="connect-elder-email">
              {t('pages.connectElder.email')}
            </label>
            <input
              id="connect-elder-email"
              className="input"
              type="email"
              value={email}
              placeholder={t('pages.connectElder.emailPlaceholder')}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((previous) => ({ ...previous, email: undefined }));
              }}
            />
            {errors.email && (
              <span className="field__error" role="alert">
                {errors.email}
              </span>
            )}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="connect-elder-relation">
              {t('pages.connectElder.relation')}
            </label>
            <input
              id="connect-elder-relation"
              className="input"
              type="text"
              value={relation}
              placeholder={t('pages.connectElder.relationPlaceholder')}
              aria-invalid={Boolean(errors.relation)}
              onChange={(event) => {
                setRelation(event.target.value);
                setErrors((previous) => ({ ...previous, relation: undefined }));
              }}
            />
            {errors.relation && (
              <span className="field__error" role="alert">
                {errors.relation}
              </span>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {t('pages.connectElder.submit')}
          </button>
        </form>
      </Card>
    </div>
  );
}
