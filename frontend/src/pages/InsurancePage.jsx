// Insurance page: sharp policy cards with metric grids, payment action and a polished combined payment history table.
import { useRef, useState } from 'react';
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

// Convert a date input value (YYYY-MM-DD) into the short style used on policy cards, e.g. "Dec 01".
function formatShortDate(isoDate) {
  if (!isoDate) return 'Not set';
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

// Empty values for the add/edit policy form.
const EMPTY_FORM = {
  provider: '',
  planName: '',
  policyNumber: '',
  policyHolder: 'Savitramma',
  sumInsured: '',
  annualPremium: '',
  premiumDueISO: '',
  renewalISO: '',
  status: 'active',
  notes: '',
  documentName: '',
};

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

// Download a dummy policy document as a text file.
// NOTE: this is dummy sample data only, even for policies that have an uploaded file.
function downloadDummyPolicy(policy) {
  const blob = new Blob(
    [`Dummy policy document for ${policy.policyType} - ${policy.policyNumber}. Sample data only.`],
    { type: 'text/plain' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${policy.policyNumber}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

  // Add/edit form state: showAddForm opens the panel, editingId is null when adding.
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formKey, setFormKey] = useState(0);
  // Drop-zone state: ref opens the hidden file picker, isDragOver highlights the box while a file is dragged over.
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Open the form empty for adding a new policy.
  function openAddForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormKey((k) => k + 1);
    setShowAddForm(true);
  }

  // Open the form pre-filled with one policy's values for editing.
  function openEditForm(policy) {
    setEditingId(policy.id);
    setForm({
      provider: policy.provider,
      planName: policy.policyType,
      policyNumber: policy.policyNumber,
      policyHolder: policy.policyHolder ?? 'Savitramma',
      sumInsured: String(policy.sumInsured),
      annualPremium: String(policy.annualPremium),
      premiumDueISO: policy.premiumDueISO ?? '',
      renewalISO: policy.renewalISO ?? '',
      status: policy.status,
      notes: policy.notes ?? '',
      documentName: policy.documentName ?? '',
    });
    setFormError('');
    setFormKey((k) => k + 1);
    setShowAddForm(true);
  }

  // Close the form without saving anything.
  function closeForm() {
    setShowAddForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  // Update one form field by name.
  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Validate the form, then either add a new policy or update the one being edited.
  function handleSavePolicy(e) {
    e.preventDefault();
    const requiredText = [form.provider, form.planName, form.policyNumber];
    const requiredNumbers = [form.sumInsured, form.annualPremium];
    const missingText = requiredText.some((v) => !v.trim());
    const missingNumbers = requiredNumbers.some((v) => !v.trim() || Number.isNaN(Number(v)));
    if (missingText || missingNumbers) {
      setFormError('Please fill in the required fields');
      return;
    }

    const policyFields = {
      provider: form.provider.trim(),
      policyType: form.planName.trim(),
      policyNumber: form.policyNumber.trim(),
      policyHolder: form.policyHolder.trim() || 'Savitramma',
      sumInsured: Number(form.sumInsured),
      annualPremium: Number(form.annualPremium),
      premiumDueISO: form.premiumDueISO,
      renewalISO: form.renewalISO,
      premiumDueDate: formatShortDate(form.premiumDueISO),
      renewalDate: formatShortDate(form.renewalISO),
      status: form.status,
      notes: form.notes.trim(),
      documentName: form.documentName,
    };

    if (editingId) {
      setPolicies((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...policyFields } : p)));
    } else {
      setPolicies((prev) => [
        ...prev,
        { id: `policy-${Date.now()}`, ...policyFields, paymentHistory: [], premiumPaid: false },
      ]);
    }
    closeForm();
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

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, boxSizing: 'border-box' };
  const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 };

  return (
    <div className="stack">
      {/* Page heading */}
      <SectionHeader title={t('nav.insurance')} subtitle={t('pages.insurance.subtitle')} />

      {/* ── Policy cards ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 className="section-header__title" style={{ margin: 0 }}>
            {t('pages.insurance.policiesTitle')}
          </h3>
          <button type="button" className="btn btn-sm" onClick={openAddForm}>
            Add insurance
          </button>
        </div>

        {/* Add / edit policy form panel */}
        {showAddForm && (
          <div className="policy-card" style={{ marginBottom: 14 }}>
            <h4 className="policy-provider" style={{ marginBottom: 12 }}>
              {editingId ? 'Edit policy' : 'Add insurance'}
            </h4>
            <form key={formKey} onSubmit={handleSavePolicy} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <label style={labelStyle}>
                  Insurer / company name *
                  <input type="text" style={inputStyle} value={form.provider} onChange={(e) => setField('provider', e.target.value)} />
                </label>
                <label style={labelStyle}>
                  Plan name *
                  <input type="text" style={inputStyle} value={form.planName} onChange={(e) => setField('planName', e.target.value)} />
                </label>
                <label style={labelStyle}>
                  Policy number *
                  <input type="text" style={inputStyle} value={form.policyNumber} onChange={(e) => setField('policyNumber', e.target.value)} />
                </label>
                <label style={labelStyle}>
                  Policy holder
                  <input type="text" style={inputStyle} value={form.policyHolder} onChange={(e) => setField('policyHolder', e.target.value)} />
                </label>
                <label style={labelStyle}>
                  Coverage amount (₹) *
                  <input type="number" min="0" style={inputStyle} value={form.sumInsured} onChange={(e) => setField('sumInsured', e.target.value)} />
                </label>
                <label style={labelStyle}>
                  Annual premium (₹) *
                  <input type="number" min="0" style={inputStyle} value={form.annualPremium} onChange={(e) => setField('annualPremium', e.target.value)} />
                </label>
                <label style={labelStyle}>
                  Premium due date
                  <input type="date" style={inputStyle} value={form.premiumDueISO} onChange={(e) => setField('premiumDueISO', e.target.value)} />
                </label>
                <label style={labelStyle}>
                  Renewal date
                  <input type="date" style={inputStyle} value={form.renewalISO} onChange={(e) => setField('renewalISO', e.target.value)} />
                </label>
                <label style={labelStyle}>
                  Status
                  <select style={inputStyle} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                  </select>
                </label>
                <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                  Notes
                  <textarea rows={3} style={inputStyle} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
                </label>
                <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                  Upload policy document (PDF or image)
                  <div
                    className={`upload-dropzone${isDragOver ? ' upload-dropzone--active' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) setField('documentName', file.name);
                    }}
                  >
                    <div className="upload-dropzone__content">
                      <svg
                        className="upload-dropzone__icon"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 15V4" />
                        <path d="M7 9l5-5 5 5" />
                        <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
                      </svg>
                      <div>
                        <p className="upload-dropzone__text">Drag and drop files here or upload</p>
                        <p className="upload-dropzone__hint">Accepted file types: JPEG, PDF, PNG, GIF</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="upload-dropzone__button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="upload-dropzone__input"
                    aria-label="Upload policy document (PDF or image)"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,image/*,application/pdf"
                    onChange={(e) => setField('documentName', e.target.files[0]?.name ?? '')}
                  />
                  <span style={{ fontSize: 13, opacity: 0.8 }}>
                    {form.documentName ? `Selected: ${form.documentName}` : 'No file chosen'}
                  </span>
                </label>
              </div>

              {formError && (
                <p style={{ color: 'var(--color-danger, #e5484d)', marginTop: 12 }}>{formError}</p>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button type="submit" className="btn btn-sm">
                  Save policy
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={closeForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

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

              {/* Pay premium, edit and download actions */}
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
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEditForm(policy)}>
                  Edit
                </button>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => downloadDummyPolicy(policy)}>
                  Download policy
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
