import type { PageReaderControls } from '../voice/usePageReader';
import { useI18n } from '../i18n/useI18n';

/**
 * Floating mini-player that appears during page/summary reading.
 * Uses a polite ARIA live region so screen readers announce state changes.
 */
export function AudioPlayer({ reader }: { reader: PageReaderControls }) {
  const { t } = useI18n();

  if (reader.state === 'idle' && !reader.chunkLabel) return null;

  const isPlaying = reader.state === 'playing';
  const isPaused = reader.state === 'paused';
  const isLoading = reader.state === 'loading';

  return (
    <div
      className="audio-player"
      role="region"
      aria-label={t.audioPlayer}
    >
      <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {isLoading && t.loadingAudio}
        {isPlaying && `${t.playingLabel} ${reader.chunkLabel}`}
        {isPaused && t.paused}
        {reader.state === 'idle' && reader.chunkLabel === 'Done' && t.finishedReading}
      </div>

      <div className="audio-player__header">
        <p className="audio-player__label">
          {(isPlaying || isLoading) && <span className="pulse-dot" aria-hidden="true" />}
          <span>{isLoading ? t.loading : reader.chunkLabel || t.ready}</span>
        </p>
        <div className="audio-player__controls">
          {isPlaying && (
            <button
              type="button"
              className="audio-player__btn"
              onClick={reader.pause}
              aria-label={t.pauseReading}
              title={t.pause}
            >
              <span aria-hidden="true">⏸️</span>
            </button>
          )}
          {isPaused && (
            <button
              type="button"
              className="audio-player__btn"
              onClick={reader.resume}
              aria-label={t.resumeReading}
              title={t.resume}
            >
              <span aria-hidden="true">▶️</span>
            </button>
          )}
          <button
            type="button"
            className="audio-player__btn"
            onClick={reader.stop}
            aria-label={t.stopReading}
            title={t.stop}
          >
            <span aria-hidden="true">⏹️</span>
          </button>
        </div>
      </div>

      <div className="audio-player__progress" role="progressbar" aria-valuenow={reader.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Reading progress">
        <div className="audio-player__progress-bar" style={{ width: `${reader.progress}%` }} />
      </div>

      <p className="audio-player__status">
        {reader.progress}% {t.complete}
      </p>
    </div>
  );
}
