// Insurance page: sharp policy cards with metric grids, payment action and a polished combined payment history table.
import { useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import { Card } from '../components/Card.jsx';
import { Badge } from '../components/Badge.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { INSURANCE_POLICIES } from '../data/mockData.js';

// Format a rupee amount with Indian digit grouping, e.g. 500000 → "₹5,00,000".
function formatRupees(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

// Today's date in short style matching payment history entries.
function todayLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

// Badge tone and label mapped from policy or payment status.
function renderStatus(status, t) {
  if (status === 'active') return <Badge tone="success">{t('status.active')}</Badge>;
  if (status === 'completed') return <Badge tone="success">{t('status.completed')}</Badge>;
  return <Badge tone="warning">{t('status.pending')}</Badge>;
}

// Individual metric box inside a policy card: label on top, value large below.
function MetricBox({ label, value, accent = false }) {
  return (
    <div className={`policy-metric${accent ? ' policy-metric--accent' : ''}`}>
      <span className="policy-metric__label">{label}</span>
      <span className="policy-metric__value">{value}</span>
    </div>
  );
}

// Insurance page: policy cards with 4-metric grid, pay action, and combined payment history table.
export function InsurancePage() {
  const { t } = useTranslation();
  const { show } = useToast();

  // Clone each policy into state so paying premiums updates the UI without mutating the source data.
  const [policies, setPolicies] = useState(() =>
    INSURANCE_POLICIES.map((p) => ({
      ...p,
      paymentHistory: p.paymentHistory.map((payment) => ({ ...payment })),
      premiumPaid: false,
    })),
  );

  // Record a premium payment for one policy, prepend a new history row and confirm with toast.
  function handlePayPremium(policyId) {
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.id !== policyId || p.premiumPaid) return p;
        const record = { date: todayLabel(), amount: p.annualPremium, status: 'completed' };
        return { ...p, premiumPaid: true, paymentHistory: [record, ...p.paymentHistory] };
      }),
    );
    show(t('pages.insurance.toastPaid'), 'success');
  }

  // Flatten all policies' payment rows into one table with the policy label attached.
  const paymentRows = policies.flatMap((p) =>
    p.paymentHistory.map((payment, i) => ({
      key: `${p.id}-${i}`,
      date: payment.date,
      policy: `${p.provider} · ${p.policyNumber}`,
      amount: payment.amount,
      status: payment.status,
    })),
  );

  return (
    <div className="stack">
      {/* Page heading */}
      <SectionHeader title={t('nav.insurance')} subtitle={t('pages.insurance.subtitle')} />

      {/* ── Policy cards ── */}
      <section>
        <h3 className="section-header__title" style={{ marginBottom: 14 }}>
          {t('pages.insurance.policiesTitle')}
        </h3>
        <div className="grid grid--2">
          {policies.map((policy) => (
            /* Policy card: provider header, type chip, 4-metric grid, pay CTA */
            <div key={policy.id} className="policy-card">
              {/* Card header: provider name + status badge */}
              <div className="policy-card__header">
                <div>
                  <h4 className="policy-provider">{policy.provider}</h4>
                  <span className="policy-number-chip">{policy.policyNumber}</span>
                </div>
                {renderStatus(policy.status, t)}
              </div>

              {/* Policy type chip */}
              <div className="policy-type-row">
                <span className="policy-type-chip">{policy.policyType}</span>
              </div>

              {/* 4-metric grid: coverage, premium, due date, renewal */}
              <div className="policy-metrics">
                <MetricBox label={t('pages.insurance.coverage')} value={formatRupees(policy.sumInsured)} accent />
                <MetricBox label={t('pages.insurance.annualPremium')} value={formatRupees(policy.annualPremium)} />
                <MetricBox label={t('pages.insurance.premiumDue')} value={policy.premiumDueDate} />
                <MetricBox label={t('pages.insurance.renewal')} value={policy.renewalDate} />
              </div>

              {/* Pay premium CTA */}
              <div className="policy-card__footer">
                <button
                  type="button"
                  className={`btn btn-sm${policy.premiumPaid ? ' btn-secondary' : ''}`}
                  disabled={policy.premiumPaid}
                  onClick={() => handlePayPremium(policy.id)}
                >
                  {policy.premiumPaid
                    ? `✓ ${t('pages.insurance.premiumPaid')}`
                    : t('pages.insurance.payPremium')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Payment history table ── */}
      <Card title={t('pages.insurance.historyTitle')}>
        {paymentRows.length === 0 ? (
          <EmptyState title={t('pages.insurance.noPayments')} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">{t('pages.insurance.date')}</th>
                  <th scope="col">{t('pages.insurance.policy')}</th>
                  <th scope="col">{t('pages.insurance.amount')}</th>
                  <th scope="col">{t('pages.insurance.status')}</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.date}</td>
                    <td>{row.policy}</td>
                    <td style={{ fontWeight: 600 }}>{formatRupees(row.amount)}</td>
                    <td>{renderStatus(row.status, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
