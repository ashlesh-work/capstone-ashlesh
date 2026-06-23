import { useCallback, useRef, useState } from 'react';
import { synthesizeSpeech } from '../lib/api';
import { useI18n } from '../i18n/useI18n';

export type ReaderState = 'idle' | 'loading' | 'playing' | 'paused';

export interface PageReaderControls {
  state: ReaderState;
  /** 0-100 progress percentage */
  progress: number;
  /** Label for current chunk (e.g. "Part 2 of 5") */
  chunkLabel: string;
  /** Start reading the full text */
  readText: (text: string, label?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const MAX_CHUNK = 4500; // under the 5000-char server limit

/**
 * Split text into chunks of at most `max` characters, preferring sentence
 * boundaries so TTS doesn't cut mid-sentence.
 */
function chunkText(text: string, max = MAX_CHUNK): string[] {
  if (text.length <= max) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= max) {
      chunks.push(remaining);
      break;
    }

    // Try to split on sentence boundary (. ! ?) within the max window.
    let splitAt = -1;
    for (let i = max; i > max * 0.5; i--) {
      if ('.!?'.includes(remaining[i]) && (i + 1 >= remaining.length || remaining[i + 1] === ' ' || remaining[i + 1] === '\n')) {
        splitAt = i + 1;
        break;
      }
    }

    // Fallback: split on last space within the window.
    if (splitAt === -1) {
      for (let i = max; i > max * 0.5; i--) {
        if (remaining[i] === ' ' || remaining[i] === '\n') {
          splitAt = i + 1;
          break;
        }
      }
    }

    // Last resort: hard split.
    if (splitAt === -1) splitAt = max;

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.filter(Boolean);
}

/**
 * Strip markdown formatting to produce clean text for TTS.
 * Removes headings markers, bold, list bullets, front-matter, etc.
 */
function stripMarkdown(md: string): string {
  return md
    // Remove YAML front-matter
    .replace(/^---[\s\S]*?---\n*/m, '')
    // Remove bracketed citations (e.g. [1], [12])
    .replace(/\[\d+\]/g, '')
    // Headings -> just the text with a pause (period)
    .replace(/^#{1,6}\s+(.*)$/gm, '$1.')
    // Bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Bullet points -> sentences
    .replace(/^[-*]\s+/gm, '')
    // Multiple newlines -> single period-space (natural pause)
    .replace(/\n{2,}/g, '. ')
    // Single newlines -> space
    .replace(/\n/g, ' ')
    // Clean up multiple spaces/periods
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Build a richer summary from a KBDoc for TTS reading.
 * Combines the title, summary field, and all section headings from the body
 * to give a comprehensive overview rather than just the one-line summary.
 */
export function buildReadableSummary(title: string, summary: string, body: string): string {
  // Extract section headings from the markdown body
  const headings = body
    .split('\n')
    .filter((line) => /^#{1,3}\s+/.test(line))
    .map((line) => line.replace(/^#{1,3}\s+/, '').trim());

  const parts = [
    `${title}.`,
    summary,
  ];

  if (headings.length > 0) {
    parts.push(`This topic covers the following sections: ${headings.join(', ')}.`);
  }

  return parts.join(' ');
}

/**
 * Hook for reading page content or summaries aloud via TTS.
 * Chunks long text and plays them sequentially with real-time progress tracking.
 */
export function usePageReader(): PageReaderControls {
  const { lang } = useI18n();
  const [state, setState] = useState<ReaderState>('idle');
  const [progress, setProgress] = useState(0);
  const [chunkLabel, setChunkLabel] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const stoppedRef = useRef(false);
  const pausedRef = useRef(false);
  const labelRef = useRef('');

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  const playChunk = useCallback(async (index: number) => {
    if (stoppedRef.current) return;
    const chunks = chunksRef.current;
    if (index >= chunks.length) {
      setState('idle');
      setProgress(100);
      setChunkLabel('Done');
      cleanup();
      return;
    }

    currentIndexRef.current = index;
    const total = chunks.length;

    if (total === 1) {
      setChunkLabel(`${labelRef.current}`);
    } else {
      setChunkLabel(`${labelRef.current} - Part ${index + 1} of ${total}`);
    }

    try {
      const url = await synthesizeSpeech(chunks[index], lang);
      if (stoppedRef.current) return;

      cleanup();
      const audio = new Audio(url);
      audioRef.current = audio;

      // Real-time progress within the current chunk via timeupdate
      audio.ontimeupdate = () => {
        if (!audio.duration || stoppedRef.current) return;
        const chunkProgress = audio.currentTime / audio.duration;
        // Map chunk-level + within-chunk progress to overall 0-100%
        const overallProgress = ((index + chunkProgress) / total) * 100;
        setProgress(Math.round(Math.min(overallProgress, 99)));
      };

      audio.onended = () => {
        if (!stoppedRef.current) {
          playChunk(index + 1);
        }
      };

      audio.onerror = () => {
        if (!stoppedRef.current) {
          // Skip failed chunk and continue
          playChunk(index + 1);
        }
      };

      await audio.play();
      setState('playing');
    } catch {
      // TTS failed for this chunk - try next
      if (!stoppedRef.current) {
        playChunk(index + 1);
      }
    }
  }, [cleanup, lang]);

  const readText = useCallback((text: string, label = 'Reading') => {
    stoppedRef.current = false;
    pausedRef.current = false;
    labelRef.current = label;

    const cleaned = stripMarkdown(text);
    const chunks = chunkText(cleaned);
    chunksRef.current = chunks;

    setState('loading');
    setProgress(0);
    setChunkLabel(`Preparing ${label.toLowerCase()}...`);

    playChunk(0);
  }, [playChunk]);

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      pausedRef.current = true;
      setState('paused');
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && pausedRef.current) {
      audioRef.current.play();
      pausedRef.current = false;
      setState('playing');
    }
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    pausedRef.current = false;
    cleanup();
    chunksRef.current = [];
    currentIndexRef.current = 0;
    setState('idle');
    setProgress(0);
    setChunkLabel('');
  }, [cleanup]);

  return { state, progress, chunkLabel, readText, pause, resume, stop };
}

export { stripMarkdown };
