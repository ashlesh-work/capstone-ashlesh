import { useCallback, useRef, useState } from 'react';
import type { Citation } from '@access508/core';
import { postChat, transcribeAudio, synthesizeSpeech } from '../lib/api';
import { useI18n } from '../i18n/useI18n';
import { useMicRecorder } from './useMicRecorder';

export interface Message {
  id: number;
  role: 'user' | 'bot' | 'note';
  text: string;
  citations?: Citation[];
}

export type Status = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error';
export type InteractionMode = 'push-to-talk' | 'conversation';

let nextId = 1;

/**
 * Drives the multimodal conversation. Text and voice share ONE path:
 * both end in `ask(text)`. Voice is purely additive.
 *
 * Supports two interaction modes:
 * - push-to-talk: user presses mic to start/stop recording
 * - conversation: continuous listening with silence detection via AudioContext,
 *   using MediaRecorder + server-side Whisper STT (works offline/cross-browser)
 *
 * Now uses the shared `useMicRecorder` for mic infrastructure.
 */
export function useVoiceSession() {
  const { lang } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('push-to-talk');
  const [readAloud, setReadAloudState] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [isMuted, setIsMutedState] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const conversationStoppedRef = useRef(false);
  const readAloudRef = useRef(false);
  const isMutedRef = useRef(false);

  // Keep ref in sync with state for use in callbacks
  const updateReadAloud = useCallback((val: boolean) => {
    readAloudRef.current = val;
    setReadAloudState(val);
  }, []);

  const append = useCallback((m: Omit<Message, 'id'>) =>
    setMessages((prev) => [...prev, { ...m, id: nextId++ }]), []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  /**
   * The single entry point for both typed and spoken questions.
   * `speak` controls whether the answer is also read aloud via TTS.
   */
  const ask = useCallback(async (text: string, speak = false) => {
    const question = text.trim();
    if (!question) return;
    append({ role: 'user', text: question });
    setStatus('thinking');
    setStatusMessage('Finding an answer...');

    try {
      const res = await postChat(question, lang);
      append({ role: 'bot', text: res.answer, citations: res.citations });

      if (!speak) {
        setStatus('idle');
        setStatusMessage('Answer ready.');
        return;
      }

      // Audio is additive: text is already shown; speak it if TTS is available.
      try {
        setStatus('speaking');
        setStatusMessage('Speaking the answer. The full text is shown above.');
        // Clean text of bracketed citations: e.g. [1], [12]
        const cleanText = res.answer.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
        const url = await synthesizeSpeech(cleanText, lang);
        stopAudio();
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setStatus('idle');
          setStatusMessage('Ready.');
        };
        await audio.play();
      } catch {
        // TTS failure never blocks the conversation.
        setStatus('idle');
        setStatusMessage('Answer ready (voice playback unavailable).');
      }
    } catch (err) {
      append({ role: 'note', text: (err as Error).message });
      setStatus('error');
      setStatusMessage((err as Error).message);
    }
  }, [append, stopAudio, lang]);

  // ── Process recorded audio ─────────────────────────────────────────

  const processRecording = useCallback(async (blob: Blob, speak: boolean): Promise<void> => {
    setStatus('transcribing');
    setStatusMessage('Transcribing what you said...');
    try {
      const text = await transcribeAudio(blob);
      if (text) {
        await ask(text, speak);
      } else {
        append({ role: 'note', text: "I didn't catch that. Please try again or type your message." });
        setStatus('idle');
        setStatusMessage('No speech detected.');
      }
    } catch (err) {
      append({ role: 'note', text: (err as Error).message });
      setStatus('error');
      setStatusMessage((err as Error).message);
    }
  }, [ask, append]);

  // ── Push-to-Talk mode (uses shared mic recorder) ──────────────────

  const pttRecorder = useMicRecorder({
    onRecording: useCallback((blob: Blob) => {
      setMicActive(false);
      processRecording(blob, true);
    }, [processRecording]),
    onEmpty: useCallback(() => {
      setMicActive(false);
      append({ role: 'note', text: "I didn't catch that. Please try again or type your message." });
      setStatus('idle');
      setStatusMessage('No speech detected.');
    }, [append]),
    onPermissionDenied: useCallback(() => {
      append({ role: 'note', text: 'Microphone permission was denied. You can still type your message.' });
      setStatus('error');
      setStatusMessage('Microphone unavailable. Type your message instead.');
    }, [append]),
    silenceDetection: false
  });

  const startListening = useCallback(async () => {
    const ok = await pttRecorder.start();
    if (ok) {
      setMicActive(true);
      setStatus('listening');
      setStatusMessage('Microphone is on. Listening now. Press the button again to stop.');
    }
  }, [pttRecorder]);

  const stopListening = useCallback(() => {
    pttRecorder.stop();
  }, [pttRecorder]);

  const toggleMic = useCallback(() => {
    if (micActive) stopListening();
    else startListening();
  }, [micActive, startListening, stopListening]);

  // ── Conversation mode (uses shared mic recorder with silence detection) ──

  // We need a separate recorder ref for conversation because it auto-restarts.
  const convRecorderRef = useRef<ReturnType<typeof useMicRecorder> | null>(null);

  const startConversationRecording = useCallback(async () => {
    if (conversationStoppedRef.current) return;

    // Create a fresh recorder for each conversation segment.
    // We use the raw MediaRecorder approach here because conversation mode
    // needs auto-restart-on-stop, which the useMicRecorder callback handles.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

      const recordingStart = Date.now();
      let silenceTimerLocal: ReturnType<typeof setTimeout> | null = null;

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close().catch(() => {});
        if (silenceTimerLocal) clearTimeout(silenceTimerLocal);

        if (conversationStoppedRef.current || isMutedRef.current) return;

        const elapsed = Date.now() - recordingStart;
        if (elapsed < 800 || chunks.length === 0) {
          if (!conversationStoppedRef.current) {
            setTimeout(() => startConversationRecording(), 300);
          }
          return;
        }

        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size < 1000) {
          if (!conversationStoppedRef.current) {
            setTimeout(() => startConversationRecording(), 300);
          }
          return;
        }

        setMicActive(false);
        await processRecording(blob, true);

        if (!conversationStoppedRef.current) {
          setTimeout(() => {
            if (!conversationStoppedRef.current) {
              setStatusMessage('Listening again. Speak when ready.');
              startConversationRecording();
            }
          }, 600);
        }
      };

      recorder.start(250);
      setMicActive(true);
      setStatus('listening');
      setStatusMessage('Conversation mode active. Speak naturally. I will respond when you pause.');

      // Silence detection
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart: number | null = null;

      const checkSilence = () => {
        if (conversationStoppedRef.current) return;

        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms < 0.01) {
          if (silenceStart === null) {
            silenceStart = Date.now();
          } else {
            const elapsed = Date.now() - recordingStart;
            const silenceDuration = Date.now() - silenceStart;
            if (silenceDuration >= 1800 && elapsed >= 800) {
              try { recorder.stop(); } catch { /* already stopped */ }
              return;
            }
          }
        } else {
          silenceStart = null;
        }

        silenceTimerLocal = setTimeout(checkSilence, 100);
      };

      silenceTimerLocal = setTimeout(checkSilence, 500);

      // Store refs for cleanup
      convRecorderRef.current = {
        start: async () => true,
        stop: () => {
          if (silenceTimerLocal) clearTimeout(silenceTimerLocal);
          if (recorder.state !== 'inactive') {
            try { recorder.stop(); } catch { /* */ }
          }
        },
        cleanup: () => {
          if (silenceTimerLocal) clearTimeout(silenceTimerLocal);
          stream.getTracks().forEach((t) => t.stop());
          audioCtx.close().catch(() => {});
          if (recorder.state !== 'inactive') {
            try { recorder.stop(); } catch { /* */ }
          }
        },
        isRecording: () => recorder.state === 'recording'
      } as any;

    } catch {
      append({ role: 'note', text: 'Microphone permission was denied. You can still type your message.' });
      setConversationActive(false);
      setMicActive(false);
      setStatus('error');
      setStatusMessage('Microphone unavailable. Type your message instead.');
    }
  }, [processRecording, append]);

  const startConversation = useCallback(() => {
    conversationStoppedRef.current = false;
    setConversationActive(true);
    startConversationRecording();
  }, [startConversationRecording]);

  const stopConversation = useCallback(() => {
    conversationStoppedRef.current = true;
    convRecorderRef.current?.cleanup();
    convRecorderRef.current = null;
    stopAudio();
    setConversationActive(false);
    setMicActive(false);
    setStatus('idle');
    setStatusMessage('Conversation mode stopped.');
  }, [stopAudio]);

  const toggleMute = useCallback(() => {
    const newVal = !isMutedRef.current;
    isMutedRef.current = newVal;
    setIsMutedState(newVal);

    if (newVal) {
      convRecorderRef.current?.stop();
      setMicActive(false);
      setStatus('idle');
      setStatusMessage('Microphone is muted.');
    } else {
      setStatusMessage('Microphone unmuted. Listening again...');
      startConversationRecording();
    }
  }, [startConversationRecording]);

  // ── Mode switching ────────────────────────────────────────────────

  const switchMode = useCallback((mode: InteractionMode) => {
    if (conversationActive) stopConversation();
    if (micActive && interactionMode === 'push-to-talk') stopListening();
    stopAudio();

    setIsMutedState(false);
    isMutedRef.current = false;

    setInteractionMode(mode);
    if (mode === 'conversation') {
      setStatus('idle');
      setStatusMessage('Conversation mode selected. Starting microphone...');
      conversationStoppedRef.current = false;
      setConversationActive(true);
      setTimeout(() => startConversationRecording(), 50);
    } else {
      setStatus('idle');
      setStatusMessage('Push-to-talk mode. Press the mic button to record.');
    }
  }, [conversationActive, micActive, interactionMode, stopConversation, stopListening, stopAudio, startConversationRecording]);

  // ── Unified mic toggle ─────────────────────────────────────────────

  const handleMicToggle = useCallback(() => {
    if (interactionMode === 'conversation') {
      if (conversationActive) {
        stopConversation();
      } else {
        startConversation();
      }
    } else {
      toggleMic();
    }
  }, [interactionMode, conversationActive, startConversation, stopConversation, toggleMic]);

  const cleanup = useCallback(() => {
    stopAudio();
    pttRecorder.cleanup();
    if (conversationActive) stopConversation();
    setIsMutedState(false);
    isMutedRef.current = false;
  }, [conversationActive, stopConversation, stopAudio, pttRecorder]);

  return {
    messages,
    status,
    statusMessage,
    micActive,
    interactionMode,
    readAloud,
    conversationActive,
    isMuted,
    ask,
    handleMicToggle,
    switchMode,
    toggleMute,
    setReadAloud: updateReadAloud,
    readAloudRef,
    cleanup
  };
}
