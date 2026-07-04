import { Link, NavLink } from 'react-router-dom';
import { ThemeToggle } from '../theme/ThemeToggle';
import { getKbDocs } from '../content/kb';
import { useI18n, type Lang } from '../i18n/useI18n';
import { useEvalEnabled, setEvalEnabled } from '../lib/evalMode';


const LANGS: { value: Lang; label: string; flag: string }[] = [
  { value: 'en', label: 'EN', flag: '🇺🇸' },
  { value: 'es', label: 'ES', flag: '🇪🇸' },
];

/** Language toggle pill group. */
function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <fieldset className="theme-toggle" aria-label={t.language} style={{ marginRight: '8px' }}>
      <legend className="visually-hidden">{t.language}</legend>
      {LANGS.map((opt) => (
        <label key={opt.value} className="theme-toggle__opt">
          <input
            type="radio"
            name="language"
            value={opt.value}
            checked={lang === opt.value}
            onChange={() => setLang(opt.value)}
          />
          <span>{opt.flag} {opt.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Header with brand, primary nav (first few topics), theme toggle, and language toggle. */
export function SiteHeader() {
  const { t, lang } = useI18n();
  const kbDocs = getKbDocs(lang);
  const primary = kbDocs.slice(0, 5);

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        Accessible<span style={{ color: 'var(--action)' }}>U</span>
      </Link>
      <nav className="site-nav" aria-label="Primary">
        {primary.map((d) => (
          <NavLink key={d.id} to={`/topics/${d.id}`}>
            {d.title.split('\u2014')[0].trim()}
          </NavLink>
        ))}
        <NavLink to="/topics">{t.allTopics}</NavLink>
      </nav>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}

/** Footer band. */
export function SiteFooter() {
  const { t } = useI18n();
  const evalEnabled = useEvalEnabled();
  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          <strong>{t.appName}</strong> &mdash; {t.footerDesc}
        </p>
        <p>{t.footerBrand}</p>
        <p>
          {/* Enable/disable the embedded trainer console (persists per browser). */}
          <button
            type="button"
            aria-pressed={evalEnabled}
            onClick={() => setEvalEnabled(!evalEnabled)}
          >
            Evaluation mode: {evalEnabled ? 'On' : 'Off'}
          </button>
          {evalEnabled && (
            <>
              {' '}
              <Link to="/eval">Open evaluation console</Link>
            </>
          )}
        </p>
      </div>
    </footer>
  );
}

/** Skip link (WCAG 2.4.1). */
export function SkipLink() {
  const { t } = useI18n();
  return (
    <a href="#main" className="skip-link">
      {t.skipToMain}
    </a>
  );
}
