// Accessible dialog: closes on Escape or a backdrop click, and locks the page behind it with aria-modal.
import { useEffect, useId } from 'react';
import { useTranslation } from '../i18n/LanguageContext.jsx';

// Modal dialog; renders nothing while closed.
export function Modal({ open, title, onClose, children, footer }) {
  const { t } = useTranslation();
  const titleId = useId();

  // Listen for Escape only while the dialog is open, and clean up on close.
  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Close when the click lands on the backdrop itself, not on the dialog content.
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onClose?.();
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal__header">
          <h2 id={titleId} className="card__title">
            {title}
          </h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label={t('common.cancel')}>
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
