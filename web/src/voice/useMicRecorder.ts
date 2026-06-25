import { useCallback, useRef } from 'react';

/**
 * Silence detection threshold (RMS energy).
 * Values below this are considered silence.
 */
const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION_MS = 1800; // 1.8s of silence triggers end-of-utterance
const MIN_RECORDING_MS = 800;     // minimum recording duration to avoid empty clips

export interface MicRecorderOptions {
  /** Called when a valid recording finishes with the audio blob. */
  onRecording: (blob: Blob) => void;
  /** Called when the recording is too short / empty. */
  onEmpty?: () => void;
  /** Called on mic permission denied. */
  onPermissionDenied?: () => void;
  /** Whether to auto-stop on silence (conversation mode). */
  silenceDetection?: boolean;
}

export interface MicRecorderControls {
  /** Start recording from the mic. Returns false if permission denied. */
  start: () => Promise<boolean>;
  /** Stop the current recording. */
  stop: () => void;
  /** Clean up all resources (streams, timers, AudioContext). */
  cleanup: () => void;
  /** Whether the mic is currently recording. */
  isRecording: () => boolean;
}

/**
 * Shared mic recording infrastructure. Handles MediaRecorder setup, stream
 * management, AudioContext-based silence detection, and resource cleanup.
 *
 * Used by both the chat-based VoiceAssistant and the voice-first navigation.
 */
export function useMicRecorder(opts: MicRecorderOptions): MicRecorderControls {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartRef = useRef(0);
  const activeRef = useRef(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    clearSilenceTimer();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* already stopped */ }
    }
    recorderRef.current = null;
    stopStream();
    activeRef.current = false;
  }, [clearSilenceTimer, stopStream]);

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up AudioContext for silence detection if needed
      if (opts.silenceDetection) {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyserRef.current = analyser;
      }

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);

      recorder.onstop = () => {
        stopStream();
        clearSilenceTimer();
        activeRef.current = false;

        const elapsed = Date.now() - recordingStartRef.current;
        if (elapsed < MIN_RECORDING_MS || chunksRef.current.length === 0) {
          opts.onEmpty?.();
          return;
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        if (blob.size < 1000) {
          opts.onEmpty?.();
          return;
        }

        opts.onRecording(blob);
      };

      recorder.start(opts.silenceDetection ? 250 : undefined);
      recordingStartRef.current = Date.now();
      recorderRef.current = recorder;
      activeRef.current = true;

      // Start silence monitoring
      if (opts.silenceDetection && analyserRef.current) {
        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let silenceStart: number | null = null;

        const checkSilence = () => {
          if (!activeRef.current || !analyserRef.current) return;

          analyser.getByteTimeDomainData(dataArray);

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
                try { recorder.stop(); } catch { /* already stopped */ }
                return;
              }
            }
          } else {
            silenceStart = null;
          }

          silenceTimerRef.current = setTimeout(checkSilence, 100);
        };

        silenceTimerRef.current = setTimeout(checkSilence, 500);
      }

      return true;
    } catch {
      opts.onPermissionDenied?.();
      return false;
    }
  }, [opts, stopStream, clearSilenceTimer]);

  const stop = useCallback(() => {
    clearSilenceTimer();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch { /* already stopped */ }
    }
  }, [clearSilenceTimer]);

  const isRecording = useCallback(() => activeRef.current, []);

  return { start, stop, cleanup, isRecording };
}
