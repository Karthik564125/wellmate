// Add Family Member page: connects a family member to this elder by email -
// no invite code, as long as that email already belongs to a signed-up
// family account. Reachable from the elder's own sidebar, but also works
// for a family member with edit permission connecting another one in.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { api, ApiError } from '../api/client.js';
import { connectFamilyMemberByEmail } from '../api/elders.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddFamilyMemberPage() {
  const { t } = useTranslation();
  const { show } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [elderId, setElderId] = useState(null);
  const [resolvingElder, setResolvingElder] = useState(true);

  const [email, setEmail] = useState('');
  const [relation, setRelation] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Same resolution as ChittiPage/AppointmentsPage: the signed-in user's own
  // Elder record if they are one, otherwise the first elder they're linked to.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setResolvingElder(false);
      return;
    }
    let cancelled = false;
    api
      .get('/me')
      .then((me) => {
        if (!cancelled) setElderId(me.ownElderId ?? me.carelinks?.[0]?.elderId ?? null);
      })
      .catch(() => {
        if (!cancelled) setElderId(null);
      })
      .finally(() => {
        if (!cancelled) setResolvingElder(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!email.trim()) next.email = t('pages.addFamilyMember.errEmailRequired');
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = t('pages.addFamilyMember.errEmailInvalid');
    if (!relation.trim()) next.relation = t('pages.addFamilyMember.errRelation');
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    connectFamilyMemberByEmail(elderId, { email: email.trim().toLowerCase(), relation: relation.trim() })
      .then(() => {
        show(t('pages.addFamilyMember.toastConnected'), 'success');
        navigate('/dashboard/elder');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setErrors({ email: err.message });
        } else {
          show(err instanceof ApiError ? err.message : t('pages.addFamilyMember.genericError'), 'danger');
        }
      })
      .finally(() => setSubmitting(false));
  }

  if (authLoading || resolvingElder) {
    return (
      <div className="stack">
        <SectionHeader title={t('pages.addFamilyMember.title')} subtitle={t('pages.addFamilyMember.subtitle')} />
        <Card>
          <p>{t('pages.appointments.loading')}</p>
        </Card>
      </div>
    );
  }

  if (!elderId) {
    return (
      <div className="stack">
        <SectionHeader title={t('pages.addFamilyMember.title')} subtitle={t('pages.addFamilyMember.subtitle')} />
        <Card>
          <p>{t('chitti.noElderLinked')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack">
      <SectionHeader title={t('pages.addFamilyMember.title')} subtitle={t('pages.addFamilyMember.subtitle')} />

      <Card>
        <form className="stack" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="add-family-email">
              {t('pages.addFamilyMember.email')}
            </label>
            <input
              id="add-family-email"
              className="input"
              type="email"
              value={email}
              placeholder={t('pages.addFamilyMember.emailPlaceholder')}
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
            <label className="field__label" htmlFor="add-family-relation">
              {t('pages.addFamilyMember.relation')}
            </label>
            <input
              id="add-family-relation"
              className="input"
              type="text"
              value={relation}
              placeholder={t('pages.addFamilyMember.relationPlaceholder')}
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
            {t('pages.addFamilyMember.submit')}
          </button>
        </form>
      </Card>
    </div>
  );
}
