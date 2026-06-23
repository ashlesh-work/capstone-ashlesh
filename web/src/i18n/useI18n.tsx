import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'es';
const STORAGE_KEY = 'a508-lang';

const translations = {
  en: {
    // App branding
    appName: 'AccessibleU',
    appTagline: 'Understand the ADA & Section 508',
    appDescription: 'A plain-language guide to U.S. digital-accessibility law \u2014 with a built-in assistant you can read or speak to.',

    // Navigation
    allTopics: 'All topics',
    browseTopics: 'Browse the topics',
    backToTopics: 'Back to all topics',
    topicNotFound: 'Topic not found',
    topicNotFoundDesc: "We couldn't find that topic.",

    // Home
    heroTitle: 'Understand the ADA & Section 508',
    essentialsTitle: 'Start with the essentials',
    essentialsDesc: 'Every topic below is written from primary sources \u2014 ADA.gov, the U.S. Access Board, and the W3C \u2014 and the assistant answers only from this same material, with citations.',

    // Toolbar
    readPage: 'Read Page',
    readSummary: 'Read Summary',
    stop: 'Stop',
    highContrast: 'High Contrast',
    decreaseFont: 'Decrease font size',
    increaseFont: 'Increase font size',
    resetFont: 'Reset font size',

    // Audio player
    audioPlayer: 'Audio player',
    loading: 'Loading...',
    done: 'Done',
    ready: 'Ready',
    pause: 'Pause',
    resume: 'Resume',
    stopReading: 'Stop reading',
    complete: 'complete',
    pauseReading: 'Pause reading',
    resumeReading: 'Resume reading',
    finishedReading: 'Finished reading.',
    playingLabel: 'Playing.',
    loadingAudio: 'Loading audio...',
    paused: 'Paused.',

    // Voice assistant
    assistantTitle: 'Accessibility Assistant',
    askAssistant: 'Ask the assistant',
    close: 'Close',
    pushToTalk: 'Push-to-Talk',
    conversation: 'Conversation',
    readAloud: 'Read answers aloud',
    voiceMode: 'Voice interaction mode',
    typeQuestion: 'Type your question',
    typePlaceholder: 'Type your question...',
    send: 'Send',
    you: 'You',
    assistant: 'Assistant',
    note: 'Note',
    opensNewTab: '(opens in a new tab)',
    expand: 'Expand to full screen',
    collapse: 'Exit full screen',
    listeningContinuously: 'Listening continuously...',
    conversationModeDesc: 'Conversation mode: speak naturally, I will respond when you pause.',
    readAloudDesc: 'You can type or speak. Answers will be read aloud.',
    defaultDesc: 'You can type or speak.',
    greeting: 'Hi! You can type or speak. Ask me about the ADA, Section 508, or WCAG. Every answer cites its source.',
    findingAnswer: 'Finding an answer...',
    answerReady: 'Answer ready.',
    speakingAnswer: 'Speaking the answer. The full text is shown above.',
    answerReadyNoVoice: 'Answer ready (voice playback unavailable).',
    readyDot: 'Ready.',
    micOn: 'Microphone is on. Listening now. Press the button again to stop.',
    noSpeech: 'No speech detected.',
    micUnavailable: 'Microphone unavailable. Type your message instead.',
    noSpeechMsg: "I didn't catch that. Please try again or type your message.",
    micDenied: 'Microphone permission was denied. You can still type your message.',
    conversationActive: 'Conversation mode active. Speak naturally. I will respond when you pause.',
    listeningAgain: 'Listening again. Speak when ready.',
    conversationStopped: 'Conversation mode stopped.',
    conversationPushToTalk: 'Push-to-talk mode. Press the mic button to record.',
    conversationStart: 'Conversation mode selected. Press the mic button to start.',
    stopVoice: 'Stop voice input',
    startVoice: 'Start voice input',
    stopConversation: 'Stop conversation',
    startConversation: 'Start conversation',
    transcribing: 'Transcribing what you said...',
    conversationNotSupported: 'Conversation mode requires microphone access. Please allow microphone permissions and try again.',
    voiceError: 'Voice recognition error',
    conversationPaused: 'Conversation mode paused.',
    mute: 'Mute microphone',
    unmute: 'Unmute microphone',
    muted: 'Muted',

    // Footer
    footerDesc: 'an educational resource on the ADA and Section 508. Informational only; not legal advice.',
    footerBrand: 'Delivered by HCLTech \u00b7 Supercharging Progress\u2122. Official logo and Roobert typeface to be supplied by the HCLTech brand team.',

    // Misc
    skipToMain: 'Skip to main content',
    colorTheme: 'Color theme',
    language: 'Language',
    signoffNote: 'This page summarizes legal requirements and is informational only \u2014 not legal advice. Specific obligations should be confirmed with counsel before you rely on them.',
    sourceLabel: 'Source:',
  },
  es: {
    // App branding
    appName: 'AccessibleU',
    appTagline: 'Comprenda la ADA y la Secci\u00f3n 508',
    appDescription: 'Una gu\u00eda en lenguaje sencillo sobre la ley de accesibilidad digital de EE.UU. \u2014 con un asistente integrado al que puede leer o hablar.',

    // Navigation
    allTopics: 'Todos los temas',
    browseTopics: 'Explorar los temas',
    backToTopics: 'Volver a todos los temas',
    topicNotFound: 'Tema no encontrado',
    topicNotFoundDesc: 'No pudimos encontrar ese tema.',

    // Home
    heroTitle: 'Comprenda la ADA y la Secci\u00f3n 508',
    essentialsTitle: 'Comience con lo esencial',
    essentialsDesc: 'Cada tema a continuaci\u00f3n est\u00e1 escrito a partir de fuentes primarias \u2014 ADA.gov, la Junta de Acceso de EE.UU. y el W3C \u2014 y el asistente responde \u00fanicamente con este mismo material, con citas.',

    // Toolbar
    readPage: 'Leer p\u00e1gina',
    readSummary: 'Leer resumen',
    stop: 'Detener',
    highContrast: 'Alto contraste',
    decreaseFont: 'Reducir tama\u00f1o de fuente',
    increaseFont: 'Aumentar tama\u00f1o de fuente',
    resetFont: 'Restablecer tama\u00f1o de fuente',

    // Audio player
    audioPlayer: 'Reproductor de audio',
    loading: 'Cargando...',
    done: 'Listo',
    ready: 'Listo',
    pause: 'Pausa',
    resume: 'Reanudar',
    stopReading: 'Detener lectura',
    complete: 'completo',
    pauseReading: 'Pausar lectura',
    resumeReading: 'Reanudar lectura',
    finishedReading: 'Lectura terminada.',
    playingLabel: 'Reproduciendo.',
    loadingAudio: 'Cargando audio...',
    paused: 'En pausa.',

    // Voice assistant
    assistantTitle: 'Asistente de Accesibilidad',
    askAssistant: 'Preguntar al asistente',
    close: 'Cerrar',
    pushToTalk: 'Pulsar para hablar',
    conversation: 'Conversaci\u00f3n',
    readAloud: 'Leer respuestas en voz alta',
    voiceMode: 'Modo de interacci\u00f3n por voz',
    typeQuestion: 'Escriba su pregunta',
    typePlaceholder: 'Escriba su pregunta...',
    send: 'Enviar',
    you: 'Usted',
    assistant: 'Asistente',
    note: 'Nota',
    opensNewTab: '(abre en una nueva pesta\u00f1a)',
    expand: 'Expandir a pantalla completa',
    collapse: 'Salir de pantalla completa',
    listeningContinuously: 'Escuchando continuamente...',
    conversationModeDesc: 'Modo conversaci\u00f3n: hable naturalmente, responder\u00e9 cuando haga una pausa.',
    readAloudDesc: 'Puede escribir o hablar. Las respuestas se leer\u00e1n en voz alta.',
    defaultDesc: 'Puede escribir o hablar.',
    greeting: '\u00a1Hola! Puede escribir o hablar. Preg\u00fanteme sobre la ADA, la Secci\u00f3n 508 o WCAG. Cada respuesta cita su fuente.',
    findingAnswer: 'Buscando una respuesta...',
    answerReady: 'Respuesta lista.',
    speakingAnswer: 'Diciendo la respuesta. El texto completo se muestra arriba.',
    answerReadyNoVoice: 'Respuesta lista (reproducci\u00f3n de voz no disponible).',
    readyDot: 'Listo.',
    micOn: 'Micr\u00f3fono encendido. Escuchando ahora. Presione el bot\u00f3n de nuevo para detener.',
    noSpeech: 'No se detect\u00f3 voz.',
    micUnavailable: 'Micr\u00f3fono no disponible. Escriba su mensaje.',
    noSpeechMsg: 'No entend\u00ed eso. Int\u00e9ntelo de nuevo o escriba su mensaje.',
    micDenied: 'Se deneg\u00f3 el permiso del micr\u00f3fono. A\u00fan puede escribir su mensaje.',
    conversationActive: 'Modo conversaci\u00f3n activo. Hable naturalmente. Responder\u00e9 cuando haga una pausa.',
    listeningAgain: 'Escuchando de nuevo. Hable cuando est\u00e9 listo.',
    conversationStopped: 'Modo conversaci\u00f3n detenido.',
    conversationPushToTalk: 'Modo pulsar para hablar. Presione el bot\u00f3n del micr\u00f3fono para grabar.',
    conversationStart: 'Modo conversaci\u00f3n seleccionado. Presione el bot\u00f3n del micr\u00f3fono para comenzar.',
    stopVoice: 'Detener entrada de voz',
    startVoice: 'Iniciar entrada de voz',
    stopConversation: 'Detener conversaci\u00f3n',
    startConversation: 'Iniciar conversaci\u00f3n',
    transcribing: 'Transcribiendo lo que dijo...',
    conversationNotSupported: 'El modo conversaci\u00f3n requiere acceso al micr\u00f3fono. Permita los permisos del micr\u00f3fono e int\u00e9ntelo de nuevo.',
    voiceError: 'Error de reconocimiento de voz',
    conversationPaused: 'Modo conversaci\u00f3n en pausa.',
    mute: 'Silenciar micrófono',
    unmute: 'Reactivar micrófono',
    muted: 'Silenciado',

    // Footer
    footerDesc: 'un recurso educativo sobre la ADA y la Secci\u00f3n 508. Solo informativo; no es asesor\u00eda legal.',
    footerBrand: 'Entregado por HCLTech \u00b7 Supercharging Progress\u2122.',

    // Misc
    skipToMain: 'Saltar al contenido principal',
    colorTheme: 'Tema de color',
    language: 'Idioma',
    signoffNote: 'Esta p\u00e1gina resume los requisitos legales y es solo informativa \u2014 no es asesor\u00eda legal. Las obligaciones espec\u00edficas deben confirmarse con un abogado antes de confiar en ellas.',
    sourceLabel: 'Fuente:',
  }
} as const;

export type Translations = Record<keyof typeof translations['en'], string>;

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) as Lang : null) || 'en'
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, l);
    }
    setLangState(l);
  };

  const t = translations[lang];

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
