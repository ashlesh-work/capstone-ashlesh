import { useCallback, useRef, useState } from 'react';
import type { Citation } from '@access508/core';
import { postChat, transcribeAudio, synthesizeSpeech } from '../lib/api';
import { useI18n } from '../i18n/useI18n';

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
 * Silence detection threshold (RMS energy).
 * Values below this are considered silence.
 */
const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION_MS = 1800; // 1.8s of silence triggers end-of-utterance
const MIN_RECORDING_MS = 800; // minimum recording duration to avoid empty clips

/**
 * Drives the multimodal conversation. Text and voice share ONE path:
 * both end in `ask(text)`. Voice is purely additive.
 *
 * Supports two interaction modes:
 * - push-to-talk: user presses mic to start/stop recording
 * - conversation: continuous listening with silence detection via AudioContext,
 *   using MediaRecorder + server-side Whisper STT (works offline/cross-browser)
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

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationStoppedRef = useRef(false);
  const recordingStartRef = useRef(0);
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

  // ── Shared: get mic stream ─────────────────────────────────────────

  const getMicStream = useCallback(async (): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    return stream;
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // ── Process recorded audio ─────────────────────────────────────────

  const processRecording = useCallback(async (speak: boolean): Promise<void> => {
    setStatus('transcribing');
    setStatusMessage('Transcribing what you said...');
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      chunksRef.current = [];

      if (blob.size < 1000) {
        // Too small, likely no speech
        append({ role: 'note', text: "I didn't catch that. Please try again or type your message." });
        setStatus('idle');
        setStatusMessage('No speech detected.');
        return;
      }

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

  // ── Push-to-Talk mode ─────────────────────────────────────────────

  const startListening = useCallback(async () => {
    try {
      const stream = await getMicStream();
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stopStream();
        setMicActive(false);
        await processRecording(true); // spoken input -> speak the answer back
      };
      recorder.start();
      recorderRef.current = recorder;
      setMicActive(true);
      setStatus('listening');
      setStatusMessage('Microphone is on. Listening now. Press the button again to stop.');
    } catch {
      append({ role: 'note', text: 'Microphone permission was denied. You can still type your message.' });
      setStatus('error');
      setStatusMessage('Microphone unavailable. Type your message instead.');
    }
  }, [getMicStream, stopStream, processRecording, append]);

  const stopListening = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const toggleMic = useCallback(() => {
    if (micActive) stopListening();
    else startListening();
  }, [micActive, startListening, stopListening]);

  // ── Conversation mode (MediaRecorder + AudioContext silence detection) ──

  const startConversationRecording = useCallback(async () => {
    if (conversationStoppedRef.current) return;

    try {
      const stream = await getMicStream();

      // Set up silence detection via AudioContext
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorderRef.current = recorder;

      recorder.onstop = async () => {
        stopStream();
        if (conversationStoppedRef.current || isMutedRef.current) return;

        const elapsed = Date.now() - recordingStartRef.current;
        if (elapsed < MIN_RECORDING_MS || chunksRef.current.length === 0) {
          // Too short, restart
          if (!conversationStoppedRef.current) {
            setTimeout(() => startConversationRecording(), 300);
          }
          return;
        }

        setMicActive(false);
        await processRecording(true);

        // Auto-restart listening after response (if not stopped)
        if (!conversationStoppedRef.current) {
          setTimeout(() => {
            if (!conversationStoppedRef.current) {
              setStatusMessage('Listening again. Speak when ready.');
              startConversationRecording();
            }
          }, 600);
        }
      };

      recorder.start(250); // collect data every 250ms
      recordingStartRef.current = Date.now();
      setMicActive(true);
      setStatus('listening');
      setStatusMessage('Conversation mode active. Speak naturally. I will respond when you pause.');

      // Monitor for silence
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStart: number | null = null;

      const checkSilence = () => {
        if (conversationStoppedRef.current || !analyserRef.current) return;

        analyser.getByteTimeDomainData(dataArray);

        // Calculate RMS energy
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms < SILENCE_THRESHOLD) {
          if (silenceStart === null) {
            silenceStart = Date.now();
          } else {
            const elapsed = Date.now() - recordingStartRef.current;
            const silenceDuration = Date.now() - silenceStart;
            if (silenceDuration >= SILENCE_DURATION_MS && elapsed >= MIN_RECORDING_MS) {
              // Silence detected - stop recording
              try {
                recorder.stop();
              } catch { /* already stopped */ }
              return;
            }
          }
        } else {
          silenceStart = null;
        }

        silenceTimerRef.current = setTimeout(checkSilence, 100);
      };

      // Start monitoring after a brief delay
      silenceTimerRef.current = setTimeout(checkSilence, 500);

    } catch {
      append({ role: 'note', text: 'Microphone permission was denied. You can still type your message.' });
      setConversationActive(false);
      setMicActive(false);
      setStatus('error');
      setStatusMessage('Microphone unavailable. Type your message instead.');
    }
  }, [getMicStream, stopStream, processRecording, append]);

  const startConversation = useCallback(() => {
    conversationStoppedRef.current = false;
    setConversationActive(true);
    startConversationRecording();
  }, [startConversationRecording]);

  const stopConversation = useCallback(() => {
    conversationStoppedRef.current = true;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* ignore */ }
    }
    stopStream();
    stopAudio();
    setConversationActive(false);
    setMicActive(false);
    setStatus('idle');
    setStatusMessage('Conversation mode stopped.');
  }, [stopStream, stopAudio]);

  const toggleMute = useCallback(() => {
    const newVal = !isMutedRef.current;
    isMutedRef.current = newVal;
    setIsMutedState(newVal);

    if (newVal) {
      // Muting: disable tracks and stop recording/monitoring to avoid loop
      streamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch { /* already stopped */ }
      }
      stopStream();
      setMicActive(false);
      setStatus('idle');
      setStatusMessage('Microphone is muted.');
    } else {
      // Unmuting: start recording/monitoring again
      setStatusMessage('Microphone unmuted. Listening again...');
      startConversationRecording();
    }
  }, [stopStream, startConversationRecording]);

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
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (conversationActive) stopConversation();
    stopStream();
    setIsMutedState(false);
    isMutedRef.current = false;
  }, [conversationActive, stopConversation, stopAudio, stopStream]);

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
