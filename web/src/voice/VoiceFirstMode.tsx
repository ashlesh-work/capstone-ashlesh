import { useEffect, useRef } from 'react';
import { useVoiceNav } from './useVoiceNav';
import { useFocusTrap } from './useFocusTrap';
import { useI18n } from '../i18n/useI18n';
import '../styles/voice-first.css';

/**
 * Full-screen, immersive voice-first overlay.
 *
 * Visual design: centered mic indicator with pulsing rings, scrolling
 * transcript log, and minimal controls. The experience is fully functional
 * without visuals — every state change is announced via ARIA live regions.
 *
 * Accessibility:
 * - APG modal dialog pattern with focus trap
 * - Escape to exit
 * - role="log" transcript with aria-live
 * - Polite live region for status announcements
 * - All controls keyboard-operable with visible focus indicators
 */
export function VoiceFirstMode({ onExit }: { onExit: () => void }) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const {
    status,
    statusLabel,
    messages,
    pageReaderState,
    pageReaderProgress,
    pageReaderLabel,
    enter,
    exit,
    pauseListening,
    resumeListening,
    isListening,
  } = useVoiceNav();

  // Enter voice mode on mount, exit on unmount.
  useEffect(() => {
    enter();
    return () => exit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus trap + Escape to exit.
  const handleClose = () => {
    exit();
    onExit();
  };
  useFocusTrap(containerRef, true, handleClose);

  // Auto-scroll transcript.
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, status]);

  // Status-to-visual mapping
  const isActive = status === 'listening';
  const isProcessing = ['transcribing', 'classifying', 'thinking'].includes(status);
  const isSpeaking = status === 'speaking' || status === 'reading';

  const micRingClass = [
    'vf-mic-ring',
    isActive ? 'vf-mic-ring--listening' : '',
    isProcessing ? 'vf-mic-ring--processing' : '',
    isSpeaking ? 'vf-mic-ring--speaking' : '',
  ].filter(Boolean).join(' ');

  const statusText = statusLabel || (
    status === 'idle' ? t.voiceGreetingShort :
    status === 'listening' ? t.voiceListening :
    status === 'error' ? t.voiceError : ''
  );

  return (
    <div
      className="vf-overlay"
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={t.voiceFirstTitle}
    >
      {/* Polite live region for screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {statusText}
      </div>

      {/* Header bar */}
      <header className="vf-header">
        <h1 className="vf-title">{t.voiceFirstTitle}</h1>
        <button
          type="button"
          className="vf-exit-btn"
          onClick={handleClose}
          aria-label={t.exitVoiceMode}
        >
          ✕ <span className="vf-exit-label">{t.exitVoiceMode}</span>
        </button>
      </header>

      {/* Central mic area */}
      <div className="vf-center">
        <button
          type="button"
          className={micRingClass}
          onClick={() => {
            if (isListening) {
              pauseListening();
            } else if (status === 'idle' || status === 'error') {
              resumeListening();
            }
          }}
          aria-label={isListening ? t.tapToStop : t.tapToSpeak}
          aria-pressed={isListening}
        >
          <span className="vf-mic-icon" aria-hidden="true">🎙️</span>
          {/* Animated rings */}
          {isActive && (
            <>
              <span className="vf-ring vf-ring--1" aria-hidden="true" />
              <span className="vf-ring vf-ring--2" aria-hidden="true" />
              <span className="vf-ring vf-ring--3" aria-hidden="true" />
            </>
          )}
        </button>

        <p className="vf-status" aria-live="off">
          {statusText}
        </p>

        {/* Page reader progress bar */}
        {pageReaderState !== 'idle' && (
          <div className="vf-reader-progress" role="progressbar" aria-valuenow={pageReaderProgress} aria-valuemin={0} aria-valuemax={100}>
            <div className="vf-reader-bar">
              <div className="vf-reader-fill" style={{ width: `${pageReaderProgress}%` }} />
            </div>
            <span className="vf-reader-label">{pageReaderLabel} — {pageReaderProgress}%</span>
          </div>
        )}
      </div>

      {/* Transcript log */}
      <div
        ref={transcriptRef}
        className="vf-transcript"
        role="log"
        aria-label="Voice conversation transcript"
        aria-live="polite"
      >
        {messages.map((m) => (
          <div key={m.id} className={`vf-msg vf-msg--${m.role}`}>
            <span className="vf-msg__role">
              {m.role === 'user' ? t.you : m.role === 'assistant' ? t.assistant : t.note}
            </span>
            <span>{m.text}</span>
          </div>
        ))}

        {isProcessing && (
          <div className="vf-msg vf-msg--system">
            <span className="vf-msg__role">{t.assistant}</span>
            <span className="vf-typing">
              <span /><span /><span />
            </span>
            <span>{statusText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
