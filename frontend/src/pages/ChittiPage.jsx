// Chitti voice assistant screen: big mic button, visible state for every
// step (never colour alone), transcript shown before anything is sent to
// family, follow-up questions, and a confirmation step with large Yes/No
// buttons. Real signed-in accounts (elder or linked family) talk to the
// real backend (Groq + keyword fallback). With no signed-in account - i.e.
// demo mode, which has no backend account behind it - this screen instead
// runs a small scripted, fully offline engine (chittiDemoEngine.js) for the
// *conversation* logic, so the feature stays demoable with no Firebase/Groq
// dependency. Demo mode's STT/TTS still try real Sarvam first (via the
// unauthenticated /assistant/demo/* routes), falling back automatically to
// the browser's own speech recognition/synthesis if Sarvam fails (e.g. no
// credits yet) - see handleMicTap and applyTurnResult below.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import { useEmergencyAlert } from '../context/EmergencyAlertContext.jsx';
import { Card } from '../components/Card.jsx';
import { Badge } from '../components/Badge.jsx';
import { Modal } from '../components/Modal.jsx';
import { SectionHeader } from '../components/SectionHeader.jsx';
import SarvamCall from '../components/SarvamCall.jsx';
import { api, ApiError } from '../api/client.js';
import { confirm as confirmTurn, getConversation, turn } from '../api/assistant.js';
import { ELDERLY_PEOPLE } from '../data/mockData.js';
import { createChittiDemoEngine, DEMO_CARDS } from '../voice/chittiDemoEngine.js';
import {
  createRecorder,
  isBrowserSpeechSupported,
  isRecordingSupported,
  listenWithBrowserSpeech,
  speakReply,
  speakReplyDemo,
  transcribeAudio,
  transcribeAudioDemo,
} from '../voice/chittiVoice.js';

const CONSENT_KEY = 'wellmate-chitti-consent';
const conversationStorageKey = (elderId) => `wellmate-chitti-conversation-${elderId}`;

// The demo persona always speaks and listens in Telugu, regardless of the
// app's own language toggle (which only affects the rest of the dashboards).
const DEMO_LANGUAGE = 'te';

// Demo mode's single elder, from the same mock data the dashboards already
// show - so Chitti's alerts name the same person visible elsewhere in the demo.
const DEMO_ELDER_NAME = ELDERLY_PEOPLE[0]?.displayName ?? 'Elder';

// Icon shown per phase; paired with text, never colour alone, per the elder UX rules.
const PHASE_ICON = {
  idle: '🎤',
  listening: '🔴',
  transcribing: '…',
  thinking: '🤔',
  follow_up: '❓',
  confirmation: '✅',
  completed: '✔️',
  error: '⚠️',
};

export function ChittiPage() {
  const { t, language } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { show } = useToast();
  const { triggerAlert } = useEmergencyAlert();

  const [elderId, setElderId] = useState(null);
  const [resolvingElder, setResolvingElder] = useState(true);

  // Demo mode: either no Firebase user at all, OR a Firebase user exists but
  // the backend returned no elder linked to them (e.g. demo role-select
  // session where sign-in was done but no elder profile was created yet).
  // In both cases we fall back to the fully offline scripted demo engine so
  // the Chitti voice feature stays demonstrable without a real elder record.
  const demoMode = !authLoading && (!user || (!resolvingElder && !elderId));

  const [phase, setPhase] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [options, setOptions] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [consentGiven, setConsentGiven] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(CONSENT_KEY) === 'yes',
  );

  const recorderRef = useRef(null);
  // Created once and reused for the whole visit, so its conversation state
  // (which medicine was asked about, what's awaiting a yes/no) persists
  // across turns the same way the real backend's Conversation document would.
  const demoEngineRef = useRef(null);
  if (demoMode && !demoEngineRef.current) {
    demoEngineRef.current = createChittiDemoEngine({
      elderName: DEMO_ELDER_NAME,
      triggerAlert,
    });
  }

  // Resolve which elder this screen is about: the signed-in user's own
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
        if (cancelled) return;
        setElderId(me.ownElderId ?? me.carelinks?.[0]?.elderId ?? null);
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

  // Resume a pending conversation if one is still open for this elder.
  useEffect(() => {
    if (!elderId) return;
    const savedId = window.localStorage.getItem(conversationStorageKey(elderId));
    if (!savedId) return;

    getConversation(savedId)
      .then(({ conversation }) => {
        if (conversation.status === 'collecting') {
          setPhase('follow_up');
          setReply(t('chitti.resumeFollowUp'));
        } else if (conversation.status === 'awaiting_confirmation') {
          setPhase('confirmation');
          setReply(t('chitti.resumeConfirmation'));
        } else {
          window.localStorage.removeItem(conversationStorageKey(elderId));
        }
      })
      .catch(() => window.localStorage.removeItem(conversationStorageKey(elderId)));
    // Only ever on first mount for a given elder, not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId]);

  function saveConversationId(elderIdForKey, conversationId) {
    if (!conversationId) {
      window.localStorage.removeItem(conversationStorageKey(elderIdForKey));
    } else {
      window.localStorage.setItem(conversationStorageKey(elderIdForKey), conversationId);
    }
  }

  // Demo mode always speaks/listens in Telugu; a real account follows the
  // app's language toggle, same as before.
  const spokenLanguage = demoMode ? DEMO_LANGUAGE : language;

  async function sendMessage(message) {
    setPhase('thinking');
    try {
      const result = demoMode
        ? demoEngineRef.current.sendMessage(message)
        : await turn({ elderId, message, language });
      applyTurnResult(result);
    } catch (err) {
      handleError(err);
    }
  }

  function handleCardTap(card) {
    setTranscript(card.label);
    setErrorMessage('');
    setPhase('thinking');
    try {
      applyTurnResult(demoEngineRef.current.selectCard(card.id));
    } catch (err) {
      handleError(err);
    }
  }

  function applyTurnResult(result) {
    if (!demoMode) {
      saveConversationId(elderId, result.status === 'completed' ? null : result.conversationId);
    }
    setReply(result.reply);
    setOptions(result.options ?? null);
    setPhase(result.status === 'needs_retry' ? 'error' : result.status);

    if (result.status === 'needs_retry') {
      setErrorMessage(result.reply);
    }

    setIsSpeaking(true);
    const speak = demoMode ? speakReplyDemo : speakReply;
    speak({ text: result.reply, language: spokenLanguage })
      .catch(() => {})
      .finally(() => setIsSpeaking(false));
  }

  function handleError(err) {
    // err.message is only the raw SpeechRecognition error code ('not-allowed',
    // 'no-speech', ...) when it hasn't already been translated by the caller
    // (see describeSpeechError below) - anything else falls back to generic.
    const message = err instanceof ApiError || err?.message ? err.message : t('chitti.genericError');
    setErrorMessage(message);
    setPhase('error');
    show(message, 'danger');
  }

  // Maps the Web Speech API's raw error codes to a message the elder can act
  // on, instead of the one-size-fits-all generic error.
  function describeSpeechError(code) {
    if (code === 'not-allowed' || code === 'audio-capture') return t('chitti.micPermissionDenied');
    if (code === 'no-speech') return t('chitti.noSpeechDetected');
    if (code === 'language-not-supported') return t('chitti.languageNotSupported');
    if (code === 'network') return t('chitti.micNetworkError');
    return t('chitti.genericError');
  }

  const handleMicTap = useCallback(async () => {
    if (demoMode) {
      if (phase === 'transcribing' || phase === 'thinking') return;

      if (phase === 'listening') {
        // Second tap: stop recording, try Sarvam first (once credits are on
        // the account, this is real AI transcription), falling back to a
        // fresh live browser listen if Sarvam fails - e.g. no credits yet,
        // which is expected until the demo recording itself.
        setPhase('transcribing');
        try {
          const audioBlob = await recorderRef.current.stop();
          let text;
          try {
            ({ transcript: text } = await transcribeAudioDemo({ audioBlob, language: DEMO_LANGUAGE }));
          } catch {
            // Stay on the "transcribing" phase rather than "listening" here -
            // this fallback listen resolves on its own, there's no second
            // tap to make, so "listening… tap to stop" would be misleading.
            ({ transcript: text } = await listenWithBrowserSpeech({ language: DEMO_LANGUAGE }));
          }
          setTranscript(text);
          await sendMessage(text);
        } catch (err) {
          handleError(new Error(describeSpeechError(err.message)));
        }
        return;
      }

      // First tap: record for Sarvam if this device supports it; otherwise
      // go straight to the browser's own one-shot listening.
      setTranscript('');
      setErrorMessage('');
      if (isRecordingSupported()) {
        try {
          recorderRef.current = createRecorder();
          await recorderRef.current.start();
          setPhase('listening');
        } catch {
          handleError(new Error(t('chitti.micPermissionDenied')));
        }
        return;
      }

      if (!isBrowserSpeechSupported()) {
        handleError(new Error(t('chitti.recordingNotSupported')));
        return;
      }
      setPhase('listening');
      try {
        const { transcript: text } = await listenWithBrowserSpeech({ language: DEMO_LANGUAGE });
        setTranscript(text);
        await sendMessage(text);
      } catch (err) {
        handleError(new Error(describeSpeechError(err.message)));
      }
      return;
    }

    if (!isRecordingSupported()) {
      handleError(new Error(t('chitti.recordingNotSupported')));
      return;
    }

    if (phase === 'listening') {
      // Second tap: stop recording and transcribe.
      setPhase('transcribing');
      try {
        const audioBlob = await recorderRef.current.stop();
        const { transcript: text } = await transcribeAudio({ elderId, audioBlob, language });
        setTranscript(text);
        await sendMessage(text);
      } catch (err) {
        handleError(err);
      }
      return;
    }

    // First tap (from idle, follow_up, confirmation, completed or error): start recording.
    try {
      recorderRef.current = createRecorder();
      await recorderRef.current.start();
      setTranscript('');
      setErrorMessage('');
      setPhase('listening');
    } catch {
      handleError(new Error(t('chitti.micPermissionDenied')));
    }
    // sendMessage/applyTurnResult/handleError are stable enough for this handler's purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, elderId, language, t, demoMode]);

  function handleOptionTap(optionText) {
    setTranscript(optionText);
    sendMessage(optionText);
  }

  function handleConfirmYes() {
    if (demoMode) {
      // No dedicated confirm endpoint locally - "yes" is just another
      // message into the same scripted engine, same as handleConfirmNo below.
      sendMessage(language === 'en' ? 'yes' : 'avunu');
      return;
    }
    const conversationId = window.localStorage.getItem(conversationStorageKey(elderId));
    if (!conversationId) return;
    setPhase('thinking');
    confirmTurn({ conversationId })
      .then(() => {
        saveConversationId(elderId, null);
        setReply(t('chitti.confirmedReply'));
        setPhase('completed');
        setIsSpeaking(true);
        speakReply({ text: t('chitti.confirmedReply'), language })
          .catch(() => {})
          .finally(() => setIsSpeaking(false));
      })
      .catch(handleError);
  }

  function handleConfirmNo() {
    sendMessage(language === 'en' ? 'no' : 'vaddu');
  }

  function acceptConsent() {
    window.localStorage.setItem(CONSENT_KEY, 'yes');
    setConsentGiven(true);
  }

  // ---- Gating screens: still loading, or (real accounts only) no elder resolved yet ----
  // Demo mode (no real signed-in account) never hits either gate below - it
  // runs the offline engine instead, so there's nothing to wait or sign in for.

  if (authLoading || resolvingElder) {
    return (
      <div className="stack">
        <SectionHeader title={t('chitti.title')} subtitle={t('chitti.subtitle')} />
        <Card>
          <p>{t('chitti.resolving')}</p>
        </Card>
      </div>
    );
  }

  if (!demoMode && !elderId) {
    return (
      <div className="stack">
        <SectionHeader title={t('chitti.title')} subtitle={t('chitti.subtitle')} />
        <Card>
          <p>{t('chitti.noElderLinked')}</p>
        </Card>
      </div>
    );
  }

  const phaseLabel = t(`chitti.phase.${phase}`);

  return (
    <div className="stack chitti-page">
      <SectionHeader title={t('chitti.title')} subtitle={t('chitti.subtitle')} />

      <p className="chitti-disclaimer">{t('chitti.medicalDisclaimer')}</p>

      <Card>
        <div className="chitti-mic-wrap">
          <button
            type="button"
            className={`chitti-mic-button chitti-mic-button--${phase}`}
            onClick={handleMicTap}
            disabled={phase === 'transcribing' || phase === 'thinking'}
            aria-pressed={phase === 'listening'}
          >
            <span className="chitti-mic-icon" aria-hidden="true">
              {PHASE_ICON[phase] ?? PHASE_ICON.idle}
            </span>
            <span className="chitti-mic-label">{phaseLabel}</span>
          </button>
          {isSpeaking && <Badge tone="info">{t('chitti.phase.speaking')}</Badge>}
        </div>

        {transcript && (
          <div className="chitti-transcript">
            <strong>{t('chitti.youSaid')}:</strong> {transcript}
          </div>
        )}

        {reply && phase !== 'idle' && phase !== 'listening' && phase !== 'transcribing' && (
          <div className="chitti-reply">{reply}</div>
        )}

        {phase === 'error' && (
          <p className="chitti-error" role="alert">
            {errorMessage}
          </p>
        )}

        {/* Demo mode's 6 proactive cards: tap one, or say it out loud - both do the same thing. */}
        {demoMode && (phase === 'idle' || phase === 'completed' || phase === 'error') && (
          <div className="chitti-cards">
            {DEMO_CARDS.map((card) => (
              <button type="button" key={card.id} className="chitti-card" onClick={() => handleCardTap(card)}>
                <span className="chitti-card__icon" aria-hidden="true">
                  {card.icon}
                </span>
                <span className="chitti-card__label">{card.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Follow-up: choice list, when the backend supplied one (e.g. which medicine). */}
        {phase === 'follow_up' && options && options.length > 0 && (
          <div className="chitti-options">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => handleOptionTap(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Confirmation: two large buttons, nothing submitted without a tap. */}
        {phase === 'confirmation' && (
          <div className="chitti-confirm-buttons">
            <button type="button" className="chitti-confirm-btn chitti-confirm-btn--yes" onClick={handleConfirmYes}>
              {t('chitti.yes')}
            </button>
            <button type="button" className="chitti-confirm-btn chitti-confirm-btn--no" onClick={handleConfirmNo}>
              {t('chitti.no')}
            </button>
          </div>
        )}
      </Card>

      <SarvamCall />

      <Modal open={!consentGiven} title={t('chitti.consentTitle')} onClose={() => {}}>
        <p>{t('chitti.consentBody')}</p>
        <button type="button" className="btn btn-primary btn-lg btn--block" onClick={acceptConsent}>
          {t('chitti.consentAccept')}
        </button>
      </Modal>
    </div>
  );
}
