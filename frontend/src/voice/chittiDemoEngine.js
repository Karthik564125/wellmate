// Fully offline Chitti conversation engine used only when there's no real
// signed-in account (demo mode). It never calls the backend - everything
// here is a small scripted state machine so Chitti stays demoable with no
// network, Firebase, or Groq/Sarvam dependency. Mirrors the *shape* of the
// real backend's /assistant/turn response ({ status, reply, options,
// conversationId }), so the same ChittiPage UI renders either path
// identically. The demo persona always speaks and reads Telugu, regardless
// of the app's own language toggle - see DEMO_CARDS and REPLIES below.

// The 6 things Chitti can proactively ask about, shown as tappable cards and
// also recognized from free speech (see KEYWORDS). Exported so ChittiPage
// can render the same labels it is driven by.
export const DEMO_CARDS = [
  { id: 'medicine', icon: '💊', label: 'మందులు అయిపోయాయా?' },
  { id: 'emergency', icon: '🚨', label: 'ఏదైనా ఎమర్జెన్సీ సహాయం కావాలా?' },
  { id: 'health', icon: '🤒', label: 'ఆరోగ్యం బాలేదా?' },
  { id: 'groceries', icon: '🛒', label: 'ఇంటికి గ్రోసరీలు కావాలా?' },
  { id: 'recharge', icon: '📱', label: 'ఏదైనా రీచార్జ్ అయిపోయిందా?' },
  { id: 'talkFamily', icon: '👨‍👩‍👧', label: 'కుటుంబంతో మాట్లాడాలా?' },
];

const MEDICINE_SUBOPTIONS = ['షుగర్', 'బీపీ', 'జ్వరం'];
const MEDICINE_ALIASES = { sugar: 'షుగర్', bp: 'బీపీ', fever: 'జ్వరం', jwaram: 'జ్వరం', jvaram: 'జ్వరం' };

// Keyword sets so the same 6 intents are also reachable by voice, not just
// by tapping a card. Telugu words plus a few common transliterations.
const KEYWORDS = {
  medicine: ['మందు', 'మందులు', 'medicine', 'tablet', 'mandu'],
  emergency: ['ఎమర్జెన్సీ', 'సహాయం', 'help', 'emergency', 'sos', 'sahayam'],
  health: ['ఆరోగ్యం', 'బాలేదు', 'bagaledu', 'arogyam'],
  groceries: ['గ్రోసరీ', 'సరుకులు', 'groceries', 'grocery', 'kirana'],
  recharge: ['రీచార్జ్', 'recharge'],
  talkFamily: ['మాట్లాడాలి', 'కుటుంబం', 'family', 'matladali', 'kutumbam'],
};

const REPLIES = {
  whichMedicine: 'ఏ మందు అయిపోయింది? షుగర్, బీపీ, లేదా జ్వరం?',
  noMatchRepeat: 'దయచేసి షుగర్, బీపీ, లేదా జ్వరం అని చెప్పండి.',
  fallback: 'క్షమించండి, అర్థం కాలేదు. దయచేసి కింద ఉన్న ఆప్షన్లలో ఒకటి ఎంచుకోండి.',
  medicineConfirmed: (name) => `సరే, ${name} మందు అయిపోయిందని మీ కుటుంబానికి చెప్పాను.`,
  emergencyConfirmed: 'SOS పంపబడింది. మీ కుటుంబానికి తెలియజేసాము.',
  healthConfirmed: 'సరే, మీ కుటుంబానికి తెలియజేసాను. వారు త్వరలో మిమ్మల్ని సంప్రదిస్తారు.',
  groceriesConfirmed: 'సరే, గ్రోసరీల గురించి మీ కుటుంబానికి చెప్పాను.',
  rechargeConfirmed: 'సరే, రీచార్జ్ గురించి మీ కుటుంబానికి చెప్పాను.',
  talkFamilyConfirmed: 'సరే, మీ కుటుంబానికి చెప్పాను. వారు మీకు కాల్ చేస్తారు.',
};

// What each intent (other than medicine, handled separately below) raises
// on the family dashboard: severity "urgent" blinks red, "calm" doesn't.
const ALERTS = {
  emergency: { severity: 'urgent', title: 'అత్యవసర హెచ్చరిక', message: (name) => `${name}కి ఇప్పుడే అత్యవసర సహాయం కావాలి.` },
  health: { severity: 'urgent', title: 'ఆరోగ్య హెచ్చరిక', message: (name) => `${name}కి ఆరోగ్యం బాలేదు, దయచేసి చూసుకోండి.` },
  groceries: { severity: 'calm', title: 'గ్రోసరీ అభ్యర్థన', message: (name) => `${name}కి ఇంటికి గ్రోసరీలు కావాలి.` },
  recharge: { severity: 'calm', title: 'రీచార్జ్ అభ్యర్థన', message: (name) => `${name} ఫోన్ రీచార్జ్ అయిపోయింది.` },
  talkFamily: { severity: 'calm', title: 'మాట్లాడాలని అభ్యర్థన', message: (name) => `${name} మీతో మాట్లాడాలనుకుంటున్నారు.` },
};

function normalize(text) {
  return (text ?? '').toLowerCase();
}

function matchIntent(text) {
  return Object.keys(KEYWORDS).find((key) => KEYWORDS[key].some((kw) => text.includes(kw.toLowerCase())));
}

function matchMedicineOption(text) {
  const exact = MEDICINE_SUBOPTIONS.find((option) => text.includes(option.toLowerCase()));
  if (exact) return exact;
  const alias = Object.keys(MEDICINE_ALIASES).find((key) => text.includes(key));
  return alias ? MEDICINE_ALIASES[alias] : null;
}

function completed(reply) {
  return { status: 'completed', reply, conversationId: null };
}

// elderName identifies whose name goes in the family-facing alert message.
export function createChittiDemoEngine({ elderName, triggerAlert }) {
  // 'idle' | 'awaiting_medicine_pick'
  let mode = 'idle';

  function raiseMedicineRequest(medicineName) {
    triggerAlert({
      elderName,
      severity: 'calm',
      title: 'మందుల అభ్యర్థన',
      message: `${elderName}కి ${medicineName} మందు అయిపోయింది.`,
    });
    return completed(REPLIES.medicineConfirmed(medicineName));
  }

  function runIntent(kind) {
    if (kind === 'medicine') {
      mode = 'awaiting_medicine_pick';
      return { status: 'follow_up', reply: REPLIES.whichMedicine, options: MEDICINE_SUBOPTIONS, conversationId: 'demo' };
    }

    const def = ALERTS[kind];
    triggerAlert({ elderName, severity: def.severity, title: def.title, message: def.message(elderName) });
    return completed(REPLIES[`${kind}Confirmed`]);
  }

  // Deterministic entry point for tapping one of the 6 cards.
  function selectCard(cardId) {
    return runIntent(cardId);
  }

  // Free-speech entry point: recognizes the same 6 intents, plus the
  // medicine follow-up's three options, from spoken/typed Telugu or English.
  function sendMessage(rawText) {
    const text = normalize(rawText);

    if (mode === 'awaiting_medicine_pick') {
      const picked = matchMedicineOption(text);
      if (!picked) {
        return { status: 'follow_up', reply: REPLIES.noMatchRepeat, options: MEDICINE_SUBOPTIONS, conversationId: 'demo' };
      }
      mode = 'idle';
      return raiseMedicineRequest(picked);
    }

    const matched = matchIntent(text);
    if (matched) return runIntent(matched);

    return completed(REPLIES.fallback);
  }

  return { selectCard, sendMessage };
}
