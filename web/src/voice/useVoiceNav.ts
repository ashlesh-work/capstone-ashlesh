import { useCallback, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  classifyIntent,
  postChat,
  transcribeAudio,
  synthesizeSpeech,
  type VoiceIntent
} from '../lib/api';
import { getKbDocs, getDoc } from '../content/kb';
import { usePageReader, buildReadableSummary } from './usePageReader';
import { useMicRecorder } from './useMicRecorder';
import { useI18n } from '../i18n/useI18n';

// ── Types ────────────────────────────────────────────────────────────

export interface VoiceNavMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  text: string;
}

export type VoiceNavStatus =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'classifying'
  | 'navigating'
  | 'speaking'
  | 'reading'
  | 'thinking'
  | 'error';

let nextMsgId = 1;

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Voice-first navigation state machine. Orchestrates the full loop:
 *   listen → transcribe → classify intent → execute → speak → listen again
 *
 * Supports navigation, page reading, Q&A, and orientation commands.
 */
export function useVoiceNav() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const pageReader = usePageReader();

  const [messages, setMessages] = useState<VoiceNavMessage[]>([]);
  const [status, setStatus] = useState<VoiceNavStatus>('idle');
  const [statusLabel, setStatusLabel] = useState('');
  const [active, setActive] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const listeningEnabledRef = useRef(true);

  // ── Helpers ──────────────────────────────────────────────────────

  const append = useCallback((msg: Omit<VoiceNavMessage, 'id'>) => {
    setMessages((prev) => [...prev, { ...msg, id: nextMsgId++ }]);
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    pageReader.stop();
  }, [pageReader]);

  /**
   * Speak text via TTS and return a promise that resolves when done.
   * Also appends the text as an assistant message in the transcript.
   */
  const speak = useCallback(async (text: string, addToTranscript = true): Promise<void> => {
    if (!activeRef.current) return;
    if (addToTranscript) {
      append({ role: 'assistant', text });
    }
    setStatus('speaking');
    setStatusLabel(t.voiceSpeaking);

    try {
      const url = await synthesizeSpeech(text, lang);
      if (!activeRef.current) return;

      stopAudio();
      const audio = new Audio(url);
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    } catch {
      // TTS failure is non-fatal; the text is already in the transcript.
    }

    if (activeRef.current) {
      setStatus('idle');
      setStatusLabel('');
    }
  }, [append, stopAudio, lang, t.voiceSpeaking]);

  // ── Intent handlers ─────────────────────────────────────────────

  const getCurrentTopicId = useCallback((): string | null => {
    const match = location.pathname.match(/^\/topics\/(.+)$/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const handleNavigate = useCallback(async (topicId: string, topicTitle: string) => {
    setStatus('navigating');
    setStatusLabel(`${t.voiceNavigating} ${topicTitle}...`);
    navigate(`/topics/${topicId}`);

    // Small delay to let the route render.
    await new Promise((r) => setTimeout(r, 300));

    await speak(`${t.voiceNowOn} ${topicTitle}. ${t.voiceWouldYouLike}`);
  }, [navigate, speak, t]);

  const handleListTopics = useCallback(async () => {
    const docs = getKbDocs(lang);
    const topicNames = docs.map((d) => d.title).join('. ');
    const text = `${t.voiceListTopicsIntro} ${topicNames}.`;
    await speak(text);
  }, [speak, lang, t]);

  const handleReadPage = useCallback(async () => {
    const topicId = getCurrentTopicId();
    if (!topicId) {
      await speak(t.voiceNoPage);
      return;
    }

    const doc = getDoc(topicId, lang);
    if (!doc) {
      await speak(t.voiceNoPage);
      return;
    }

    setStatus('reading');
    setStatusLabel(t.voiceReading);
    append({ role: 'assistant', text: `${t.voiceReading} ${doc.title}...` });

    // Use the page reader for chunked TTS playback.
    pageReader.readText(doc.body, doc.title);

    // Wait for the page reader to finish.
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (pageReader.state === 'idle' || !activeRef.current) {
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });

    if (activeRef.current) {
      setStatus('idle');
      setStatusLabel('');
    }
  }, [getCurrentTopicId, pageReader, append, speak, lang, t]);

  const handleReadSummary = useCallback(async () => {
    const topicId = getCurrentTopicId();
    if (!topicId) {
      await speak(t.voiceNoPage);
      return;
    }

    const doc = getDoc(topicId, lang);
    if (!doc) {
      await speak(t.voiceNoPage);
      return;
    }

    const richSummary = buildReadableSummary(doc.title, doc.summary, doc.body);
    await speak(richSummary);
  }, [getCurrentTopicId, speak, lang, t]);

  const handleWhereAmI = useCallback(async () => {
    const topicId = getCurrentTopicId();
    if (topicId) {
      const doc = getDoc(topicId, lang);
      if (doc) {
        await speak(`${t.voiceWhereAmI} ${doc.title}. ${doc.summary}`);
        return;
      }
    }
    if (location.pathname === '/topics') {
      await speak(t.voiceOnTopics);
    } else {
      await speak(t.voiceOnHome);
    }
  }, [getCurrentTopicId, location.pathname, speak, lang, t]);

  const handleGoBack = useCallback(async () => {
    await speak(t.voiceGoingBack, false);
    navigate('/topics');
    append({ role: 'assistant', text: t.voiceGoingBack });
  }, [navigate, speak, append, t]);

  const handleGoHome = useCallback(async () => {
    await speak(t.voiceGoingHome, false);
    navigate('/');
    append({ role: 'assistant', text: t.voiceGoingHome });
  }, [navigate, speak, append, t]);

  const handleQuestion = useCallback(async (text: string) => {
    append({ role: 'user', text });
    setStatus('thinking');
    setStatusLabel(t.voiceThinking);

    try {
      const res = await postChat(text, lang);
      // Clean citations for TTS
      const cleanAnswer = res.answer.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
      await speak(cleanAnswer);
    } catch (err) {
      await speak(t.voiceNavError);
    }
  }, [append, speak, lang, t]);

  const handleHelp = useCallback(async () => {
    await speak(t.voiceHelp);
  }, [speak, t]);

  const handleStop = useCallback(() => {
    stopAudio();
    setStatus('idle');
    setStatusLabel(t.voiceStopping);
    append({ role: 'system', text: t.voiceStopping });
  }, [stopAudio, append, t]);

  // ── Main intent dispatcher ──────────────────────────────────────

  const dispatchIntent = useCallback(async (intent: VoiceIntent) => {
    switch (intent.type) {
      case 'navigate':
        await handleNavigate(intent.topicId, intent.topicTitle);
        break;
      case 'list_topics':
        await handleListTopics();
        break;
      case 'read_page':
        await handleReadPage();
        break;
      case 'read_summary':
        await handleReadSummary();
        break;
      case 'where_am_i':
        await handleWhereAmI();
        break;
      case 'go_back':
        await handleGoBack();
        break;
      case 'go_home':
        await handleGoHome();
        break;
      case 'question':
        await handleQuestion(intent.text);
        break;
      case 'help':
        await handleHelp();
        break;
      case 'stop':
        handleStop();
        break;
    }
  }, [
    handleNavigate, handleListTopics, handleReadPage, handleReadSummary,
    handleWhereAmI, handleGoBack, handleGoHome, handleQuestion,
    handleHelp, handleStop
  ]);

  // ── Recording → Transcription → Classification → Dispatch ───────

  const processUtterance = useCallback(async (blob: Blob) => {
    if (!activeRef.current) return;

    // Step 1: Transcribe
    setStatus('transcribing');
    setStatusLabel(t.transcribing);

    let text: string;
    try {
      text = await transcribeAudio(blob);
    } catch {
      setStatus('idle');
      setStatusLabel('');
      return;
    }

    if (!text || !activeRef.current) {
      setStatus('idle');
      setStatusLabel('');
      return;
    }

    append({ role: 'user', text });

    // Step 2: Classify intent
    setStatus('classifying');
    setStatusLabel(t.voiceClassifying);

    const docs = getKbDocs(lang);
    const availableTopics = docs.map((d) => ({ id: d.id, title: d.title }));
    const topicId = getCurrentTopicId();
    const currentPage = topicId
      ? getDoc(topicId, lang)?.title ?? topicId
      : location.pathname === '/topics'
        ? 'Topics list'
        : 'Home';

    const intent = await classifyIntent(text, availableTopics, currentPage);

    // Step 3: Dispatch
    await dispatchIntent(intent);

    // Step 4: Return to listening (unless stopped or exited)
    if (activeRef.current && listeningEnabledRef.current) {
      startListeningLoop();
    }
  }, [append, dispatchIntent, getCurrentTopicId, location.pathname, lang, t]);

  // ── Mic recording with silence detection ────────────────────────

  const recorder = useMicRecorder({
    onRecording: useCallback((blob: Blob) => {
      processUtterance(blob);
    }, [processUtterance]),
    onEmpty: useCallback(() => {
      // Restart listening on empty recording.
      if (activeRef.current && listeningEnabledRef.current) {
        setTimeout(() => startListeningLoop(), 300);
      }
    }, []),
    onPermissionDenied: useCallback(() => {
      append({ role: 'system', text: t.micDenied });
      setStatus('error');
      setStatusLabel(t.micUnavailable);
    }, [append, t]),
    silenceDetection: true
  });

  const startListeningLoop = useCallback(async () => {
    if (!activeRef.current || !listeningEnabledRef.current) return;
    setStatus('listening');
    setStatusLabel(t.voiceListening);
    await recorder.start();
  }, [recorder, t]);

  // ── Public API ──────────────────────────────────────────────────

  const enter = useCallback(async () => {
    activeRef.current = true;
    listeningEnabledRef.current = true;
    setActive(true);
    setMessages([]);
    setStatus('idle');

    // Speak greeting, then start listening.
    await speak(t.voiceGreeting);

    if (activeRef.current) {
      startListeningLoop();
    }
  }, [speak, startListeningLoop, t]);

  const exit = useCallback(() => {
    activeRef.current = false;
    listeningEnabledRef.current = false;
    stopAudio();
    recorder.cleanup();
    setActive(false);
    setStatus('idle');
    setStatusLabel('');
    setMessages([]);
  }, [stopAudio, recorder]);

  const pauseListening = useCallback(() => {
    listeningEnabledRef.current = false;
    recorder.stop();
    setStatus('idle');
    setStatusLabel(t.voiceStopping);
  }, [recorder, t]);

  const resumeListening = useCallback(() => {
    listeningEnabledRef.current = true;
    startListeningLoop();
  }, [startListeningLoop]);

  return {
    active,
    status,
    statusLabel,
    messages,
    pageReaderState: pageReader.state,
    pageReaderProgress: pageReader.progress,
    pageReaderLabel: pageReader.chunkLabel,
    enter,
    exit,
    pauseListening,
    resumeListening,
    isListening: status === 'listening',
  };
}
