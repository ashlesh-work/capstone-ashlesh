import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceSession, type InteractionMode } from './useVoiceSession';
import { useFocusTrap } from './useFocusTrap';
import { useI18n } from '../i18n/useI18n';
import '../styles/voice.css';

const MODES: { value: InteractionMode; iconKey: string }[] = [
  { value: 'push-to-talk', iconKey: 'pushToTalk' },
  { value: 'conversation', iconKey: 'conversation' },
];

/**
 * Transcript-first, multimodal voice assistant.
 * - Voice is additive: every task is completable with keyboard + text alone.
 * - APG modal dialog: focus moves in, is trapped, Esc closes, focus returns.
 * - Polite live region announces state; the transcript is a role="log".
 * - Supports push-to-talk and conversation modes.
 * - Readout toggle for typed input.
 * - Full-page mode for immersive chat experience.
 * - Auto-scrolls to latest message.
 */
export function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [fullPage, setFullPage] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const {
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
    setReadAloud,
    cleanup
  } = useVoiceSession();
  const [draft, setDraft] = useState('');

  // Auto-scroll transcript to bottom when messages change
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, status]);

  // Initialize greeting message if empty
  useEffect(() => {
    if (open && messages.length === 0) {
      // Greeting is set from the hook's initial state — no action needed here
    }
  }, [open, messages.length]);

  const close = useCallback(() => {
    cleanup();
    setOpen(false);
    setFullPage(false);
  }, [cleanup]);

  useFocusTrap(dialogRef, open, close);

  const submit = () => {
    if (!draft.trim()) return;
    ask(draft, readAloud);
    setDraft('');
  };

  const micLabel = interactionMode === 'conversation'
    ? (conversationActive ? t.stopConversation : t.startConversation)
    : (micActive ? t.stopVoice : t.startVoice);

  const micClassName = [
    'mic-btn',
    conversationActive ? 'mic-btn--conversation' : '',
  ].filter(Boolean).join(' ');

  const dialogClassName = [
    'voice-dialog',
    fullPage ? 'voice-dialog--fullpage' : '',
  ].filter(Boolean).join(' ');

  // Show greeting if no messages yet
  const displayMessages = messages.length === 0
    ? [{ id: 0, role: 'bot' as const, text: t.greeting }]
    : messages;

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className="voice-launcher"
        aria-haspopup="dialog"
        aria-controls="voice-dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">💬</span> {t.askAssistant}
      </button>

      {open && (
        <div className="voice-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div
            id="voice-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-title"
            className={dialogClassName}
          >
            <div className="voice-dialog__header">
              <h2 id="voice-title" className="voice-dialog__title">
                {t.assistantTitle}
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setFullPage((v) => !v)}
                  aria-label={fullPage ? t.collapse : t.expand}
                  title={fullPage ? t.collapse : t.expand}
                  style={{ padding: '6px 10px', fontSize: '1rem' }}
                >
                  {fullPage ? '⊡' : '⊞'}
                </button>
                <button type="button" className="btn btn--secondary" onClick={close}>
                  {t.close}
                </button>
              </div>
            </div>

            {/* Mode selector */}
            <div style={{ padding: 'var(--space-xs) var(--space-lg)', borderBottom: '1px solid var(--glass-border)' }}>
              <fieldset className="voice-mode-selector" aria-label={t.voiceMode}>
                <legend className="visually-hidden">{t.voiceMode}</legend>
                {MODES.map((m) => (
                  <label key={m.value}>
                    <input
                      type="radio"
                      name="voice-mode"
                      value={m.value}
                      checked={interactionMode === m.value}
                      onChange={() => switchMode(m.value)}
                    />
                    <span>
                      {m.value === 'push-to-talk' ? t.pushToTalk : t.conversation}
                    </span>
                  </label>
                ))}
              </fieldset>
            </div>

            {/* Readout toggle */}
            <div className="readout-toggle">
              <label className="readout-toggle__label" htmlFor="readout-switch">
                <span aria-hidden="true">🔊</span> {t.readAloud}
              </label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="readout-switch"
                  checked={readAloud}
                  onChange={(e) => setReadAloud(e.target.checked)}
                />
                <span className="toggle-switch__track" aria-hidden="true" />
              </div>
            </div>

            {/* Polite live region for ephemeral state */}
            <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
              {statusMessage}
            </div>

            {/* Conversation mode badge */}
            {conversationActive && (
              <div style={{ padding: '8px var(--space-lg) 0' }}>
                <span
                  className="conversation-badge"
                  style={isMuted ? { backgroundColor: 'var(--canvas-alt)', color: 'var(--ink-muted)' } : undefined}
                >
                  <span
                    className="conversation-badge__dot"
                    style={isMuted ? { animation: 'none', backgroundColor: 'var(--ink-muted)' } : undefined}
                    aria-hidden="true"
                  />
                  {isMuted ? t.muted : t.listeningContinuously}
                </span>
              </div>
            )}

            <div
              ref={transcriptRef}
              className="transcript"
              role="log"
              aria-label="Conversation transcript"
              aria-live="polite"
            >
              {displayMessages.map((m) => (
                <div
                  key={m.id}
                  className={`msg msg--${m.role}`}
                >
                  <span className="msg__role">
                    {m.role === 'user' ? t.you : m.role === 'bot' ? t.assistant : t.note}
                  </span>
                  <div>{m.text}</div>
                  {'citations' in m && m.citations && m.citations.length > 0 && (
                    <div className="citations">
                      {m.citations.map((c) => (
                        <a
                          key={c.n}
                          className="citation-chip"
                          href={c.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          [{c.n}] {c.sourceTitle}
                          <span className="visually-hidden"> {t.opensNewTab}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Inline status indicators */}
              {(status === 'thinking' || status === 'transcribing' || status === 'speaking') && (
                <div className="msg msg--note">
                  <span className="msg__role">{t.assistant}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="typing-indicator" aria-hidden="true">
                      <span /><span /><span />
                    </span>
                    {statusMessage}
                  </div>
                </div>
              )}
            </div>

            <form
              className="voice-controls"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label htmlFor="voice-input" className="visually-hidden">
                {t.typeQuestion}
              </label>
              <textarea
                id="voice-input"
                className="voice-input"
                data-autofocus
                rows={2}
                value={draft}
                placeholder={t.typePlaceholder}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
              <button
                type="button"
                className={micClassName}
                aria-pressed={micActive || conversationActive}
                onClick={handleMicToggle}
              >
                <span aria-hidden="true">🎙️</span>
                <span className="visually-hidden">
                  {micLabel}
                </span>
              </button>
              {conversationActive && (
                <button
                  type="button"
                  className={`mic-btn ${isMuted ? 'mic-btn--muted' : ''}`}
                  aria-pressed={isMuted}
                  onClick={toggleMute}
                  title={isMuted ? t.unmute : t.mute}
                  style={{
                    backgroundColor: isMuted ? 'var(--canvas-alt)' : 'transparent',
                    borderColor: 'var(--action)',
                    color: isMuted ? 'var(--ink-muted)' : 'var(--action)',
                    marginLeft: '4px'
                  }}
                >
                  <span aria-hidden="true">{isMuted ? '🔇' : '🎙️'}</span>
                  <span className="visually-hidden">
                    {isMuted ? t.unmute : t.mute}
                  </span>
                </button>
              )}
              <button type="submit" className="btn btn--primary" disabled={!draft.trim()}>
                {readAloud ? `📢 ${t.send}` : t.send}
              </button>
            </form>

            <p
              aria-hidden="true"
              style={{ margin: 0, padding: '0 24px 16px', fontSize: '0.8125rem', color: 'var(--ink-muted)' }}
            >
              {status === 'idle'
                ? interactionMode === 'conversation'
                  ? t.conversationModeDesc
                  : readAloud
                    ? t.readAloudDesc
                    : t.defaultDesc
                : statusMessage}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
