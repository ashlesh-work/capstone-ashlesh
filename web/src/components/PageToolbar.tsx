import { useCallback, useEffect, useState } from 'react';
import type { KBDoc } from '@access508/core';
import { usePageReader, buildReadableSummary } from '../voice/usePageReader';
import { AudioPlayer } from './AudioPlayer';
import { useI18n } from '../i18n/useI18n';
import '../styles/toolbar.css';

const FONT_SCALE_KEY = 'a508-font-scale';
const CONTRAST_KEY = 'a508-contrast';

const SCALES = [0.85, 1, 1.15, 1.3] as const;
const SCALE_LABELS = ['Smaller', 'Default', 'Larger', 'Largest'] as const;

/**
 * Page-level accessibility toolbar with:
 * - Read Page / Read Summary (TTS)
 * - Font size control (A- / A / A+)
 * - High contrast toggle
 */
export function PageToolbar({ doc }: { doc: KBDoc }) {
  const reader = usePageReader();
  const { t } = useI18n();

  // Font scale
  const [scaleIndex, setScaleIndex] = useState(() => {
    const saved = localStorage.getItem(FONT_SCALE_KEY);
    const idx = saved ? SCALES.indexOf(Number(saved) as typeof SCALES[number]) : 1;
    return idx >= 0 ? idx : 1;
  });

  useEffect(() => {
    const scale = SCALES[scaleIndex];
    document.documentElement.style.setProperty('--font-scale', String(scale));
    localStorage.setItem(FONT_SCALE_KEY, String(scale));
  }, [scaleIndex]);

  const decreaseFont = () => setScaleIndex((i) => Math.max(0, i - 1));
  const increaseFont = () => setScaleIndex((i) => Math.min(SCALES.length - 1, i + 1));
  const resetFont = () => setScaleIndex(1);

  // High contrast
  const [highContrast, setHighContrast] = useState(() =>
    localStorage.getItem(CONTRAST_KEY) === 'high'
  );

  useEffect(() => {
    if (highContrast) {
      document.documentElement.dataset.contrast = 'high';
      localStorage.setItem(CONTRAST_KEY, 'high');
    } else {
      delete document.documentElement.dataset.contrast;
      localStorage.removeItem(CONTRAST_KEY);
    }
  }, [highContrast]);

  // Reading handlers
  const handleReadPage = useCallback(() => {
    if (reader.state !== 'idle') {
      reader.stop();
      return;
    }
    reader.readText(doc.body, t.readPage);
  }, [reader, doc.body, t.readPage]);

  const handleReadSummary = useCallback(() => {
    if (reader.state !== 'idle') {
      reader.stop();
      return;
    }
    // Build a richer summary from title, summary, and section headings
    const richSummary = buildReadableSummary(doc.title, doc.summary, doc.body);
    reader.readText(richSummary, t.readSummary);
  }, [reader, doc.title, doc.summary, doc.body, t.readSummary]);

  const isReading = reader.state !== 'idle';

  return (
    <>
      <div className="page-toolbar" role="toolbar" aria-label="Page accessibility controls">
        {/* Read controls */}
        <div className="page-toolbar__group">
          <button
            type="button"
            className={`tb-btn ${isReading ? 'tb-btn--active' : ''}`}
            onClick={handleReadPage}
            aria-label={isReading ? t.stopReading : t.readPage}
            title={isReading ? t.stopReading : t.readPage}
          >
            <span className="tb-btn__icon" aria-hidden="true">{isReading ? '⏹️' : '🔊'}</span>
            <span>{isReading ? t.stop : t.readPage}</span>
          </button>

          <button
            type="button"
            className="tb-btn"
            onClick={handleReadSummary}
            disabled={isReading}
            aria-label={t.readSummary}
            title={t.readSummary}
          >
            <span className="tb-btn__icon" aria-hidden="true">📋</span>
            <span>{t.readSummary}</span>
          </button>
        </div>

        <div className="page-toolbar__divider" aria-hidden="true" />

        {/* Font size */}
        <div className="page-toolbar__group font-size-group" role="group" aria-label="Font size">
          <button
            type="button"
            className="tb-btn"
            onClick={decreaseFont}
            disabled={scaleIndex === 0}
            aria-label={t.decreaseFont}
            title={t.decreaseFont}
          >
            A-
          </button>
          <button
            type="button"
            className="tb-btn"
            onClick={resetFont}
            aria-label={`${t.resetFont} (${SCALE_LABELS[scaleIndex]})`}
            title={t.resetFont}
          >
            A
          </button>
          <button
            type="button"
            className="tb-btn"
            onClick={increaseFont}
            disabled={scaleIndex === SCALES.length - 1}
            aria-label={t.increaseFont}
            title={t.increaseFont}
          >
            A+
          </button>
        </div>

        <div className="page-toolbar__divider" aria-hidden="true" />

        {/* High contrast */}
        <button
          type="button"
          className="tb-btn"
          aria-pressed={highContrast}
          onClick={() => setHighContrast((v) => !v)}
          aria-label={highContrast ? `${t.highContrast} (ON)` : t.highContrast}
          title={t.highContrast}
        >
          <span className="tb-btn__icon" aria-hidden="true">◐</span>
          <span>{t.highContrast}</span>
        </button>
      </div>

      <AudioPlayer reader={reader} />
    </>
  );
}
