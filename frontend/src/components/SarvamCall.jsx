// "Call Chitti" card: asks the backend for a short-lived Sarvam session ticket,
// then mounts the official Sarvam ConvAI widget, which runs the voice call with
// its own controls. The API key, ticket and upstream URL are never rendered or
// logged here - the ticket only goes into the widget's session-endpoint attribute.
// In demo mode (no real Firebase account or no elder linked), shows a visual
// "Live call requires sign-in" notice instead of an error.
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { api } from '../api/client.js';
import { Card } from './Card.jsx';

const WIDGET_SCRIPT_SRC = 'https://unpkg.com/sarvam-convai-embed';

// The api client's base is e.g. "<origin>/api/v1"; the widget needs the backend
// origin so it can reach the session endpoint on the API server, not this site.
function backendOrigin() {
  return new URL(import.meta.env.VITE_API_BASE_URL, window.location.href).origin;
}

// Loads the official widget script once per page, no matter how often the card mounts.
function ensureWidgetScript() {
  const existing = document.head.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`);
  if (existing) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = WIDGET_SCRIPT_SRC;
  document.head.appendChild(script);
}

// Returns 'unsupported' / 'micDenied' when the browser can't or won't give the mic, else null.
async function checkMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
  try {
    const permission = await navigator.permissions?.query({ name: 'microphone' });
    if (permission?.state === 'denied') return 'micDenied';
  } catch {
    // Some browsers reject the 'microphone' permission query; fall through and let the call try.
  }
  return null;
}

export default function SarvamCall() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // In demo mode (no real Firebase account) show a friendly info card instead of
  // the live call widget, which requires a signed-in user and a Sarvam session ticket.
  const isDemo = !user;

  // idle | preparing | ready | error | unsupported | micDenied
  const [status, setStatus] = useState('idle');
  const [errorKey, setErrorKey] = useState('chitti.callError');
  const [widgetConfig, setWidgetConfig] = useState(null);
  const hostRef = useRef(null);

  // Mount the widget element into the host div only while the call is ready.
  // Built with setAttribute because React does not reliably pass dashed custom-element attributes.
  useEffect(() => {
    if (status !== 'ready' || !widgetConfig || !hostRef.current) return undefined;
    ensureWidgetScript();

    const widget = document.createElement('sarvam-widget');
    widget.setAttribute('session-endpoint', widgetConfig.sessionEndpoint);
    widget.setAttribute('app-id', widgetConfig.appId);
    widget.setAttribute('org-id', widgetConfig.orgId);
    widget.setAttribute('workspace-id', widgetConfig.workspaceId);
    widget.setAttribute('user-id', widgetConfig.userId);
    widget.setAttribute('button-text', t('chitti.callButton'));
    widget.setAttribute('button-color', '#7a2448');
    widget.setAttribute('text-color', '#ffffff');
    widget.setAttribute('position', 'bottom-right');
    widget.setAttribute('size', 'medium');
    hostRef.current.appendChild(widget);

    return () => widget.remove();
    // Re-mounting on every language change would drop a live call, so the label is read once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, widgetConfig]);

  async function handleStart() {
    if (!user?.uid) {
      setErrorKey('chitti.callError');
      setStatus('error');
      return;
    }

    try {
      const blocked = await checkMicrophone();
      if (blocked) {
        setStatus(blocked);
        return;
      }
    } catch {
      // Treat an unexpected permission check failure as "try the call anyway".
    }

    setStatus('preparing');
    try {
      const ticket = await api.post('/sarvam/ticket', {});
      setWidgetConfig({
        sessionEndpoint: `${backendOrigin()}${ticket.sessionEndpointPath}`,
        appId: ticket.appId,
        orgId: ticket.orgId,
        workspaceId: ticket.workspaceId,
        userId: user.uid,
      });
      setStatus('ready');
    } catch (err) {
      setErrorKey(err?.code === 'sarvam_not_configured' ? 'chitti.callNotConfigured' : 'chitti.callError');
      setStatus('error');
    }
  }

  // Demo mode: render a visual info card instead of the live call widget.
  if (isDemo) {
    return (
      <div className="sarvam-call">
        <Card>
          <div className="sarvam-demo-banner">
            <span className="sarvam-demo-banner__icon" aria-hidden="true">🎙️</span>
            <div>
              <h3 className="sarvam-call__title" style={{ marginBottom: 4 }}>
                Sarvam AI Voice Call — Demo
              </h3>
              <p style={{ color: 'var(--mut)', fontSize: 14, margin: 0 }}>
                Live Telugu voice calls are powered by Sarvam AI and available for signed-in users with an elder profile.
                Use the mic button above to try Chitti's offline demo mode — tap a card or speak in Telugu!
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const message = {
    preparing: t('chitti.callPreparing'),
    ready: t('chitti.callReady'),
    error: t(errorKey),
    unsupported: t('chitti.callUnsupported'),
    micDenied: t('chitti.callMicDenied'),
  }[status];

  const showButton = status === 'idle' || status === 'preparing' || status === 'error' || status === 'micDenied';

  return (
    <div className="sarvam-call">
      <Card>
        <h3 className="sarvam-call__title">{t('chitti.callTitle')}</h3>

        {showButton && (
          <button
            type="button"
            className="btn btn-secondary sarvam-call__button"
            onClick={handleStart}
            disabled={status === 'preparing'}
          >
            {t('chitti.callButton')}
          </button>
        )}

        {message && (
          <p className="sarvam-call__message" role="status" aria-live="polite">
            {message}
          </p>
        )}

        {/* The widget mounts here when ready; it draws its own call controls. */}
        <div ref={hostRef} className="sarvam-call__host" />
      </Card>

      <p className="sarvam-call__hint">{t('chitti.callHint')}</p>
    </div>
  );
}
