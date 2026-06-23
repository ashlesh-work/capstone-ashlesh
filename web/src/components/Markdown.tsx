import { Fragment, type ReactNode } from 'react';

/**
 * Minimal, safe markdown renderer for the subset our KB uses: #/##/### headings,
 * bullet lists, paragraphs, and **bold**. No raw HTML is ever injected, which
 * keeps the output semantic (real h2/h3/ul/p) and free of XSS surface.
 */

function renderInline(text: string): ReactNode {
  // Split on **bold** spans only.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(part);
    return m ? <strong key={i}>{m[1]}</strong> : <Fragment key={i}>{part}</Fragment>;
  });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.split(/\n{2,}/);
  const out: ReactNode[] = [];

  blocks.forEach((block, bi) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const id = slug(text);
      if (level === 1) out.push(<h1 key={bi}>{renderInline(text)}</h1>);
      else if (level === 2) out.push(<h2 key={bi} id={id}>{renderInline(text)}</h2>);
      else out.push(<h3 key={bi} id={id}>{renderInline(text)}</h3>);
      return;
    }

    // Bullet list: lines starting with "- ".
    if (trimmed.split('\n').every((l) => /^[-*]\s+/.test(l.trim()))) {
      out.push(
        <ul key={bi}>
          {trimmed.split('\n').map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^[-*]\s+/, '').trim())}</li>
          ))}
        </ul>
      );
      return;
    }

    out.push(<p key={bi}>{renderInline(trimmed)}</p>);
  });

  return <>{out}</>;
}
