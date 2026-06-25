import { Link } from 'react-router-dom';
import { getKbDocs } from '../content/kb';
import { useI18n } from '../i18n/useI18n';
import { useVoiceFirstContext } from '../voice/VoiceFirstContext';
import '../styles/voice-first.css';

export function Home() {
  const { t, lang } = useI18n();
  const kbDocs = getKbDocs(lang);
  const { enterVoiceFirst } = useVoiceFirstContext();

  return (
    <>
      <section className="tile tile--brand">
        <div className="container">
          <h1>{t.heroTitle}</h1>
          <p style={{ fontSize: '1.5rem', maxWidth: '40ch' }}>
            {t.appDescription}
          </p>
          <p style={{ marginTop: '1.5rem', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link className="btn btn--primary" to="/topics">
              {t.browseTopics}
            </Link>
          </p>
        </div>
      </section>

      {/* Voice-first CTA */}
      <section className="tile">
        <div className="container">
          <div className="voice-first-cta">
            <button
              type="button"
              className="voice-first-btn"
              onClick={enterVoiceFirst}
            >
              <span className="voice-first-btn__icon" aria-hidden="true">🎙️</span>
              {t.startVoiceExperience}
            </button>
            <p className="voice-first-cta__desc">
              {t.voiceFirstDesc}
            </p>
          </div>
        </div>
      </section>

      <section className="tile">
        <div className="container">
          <h2>{t.essentialsTitle}</h2>
          <p style={{ color: 'var(--ink-muted)', maxWidth: '60ch' }}>
            {t.essentialsDesc}
          </p>
          <div className="card-grid" style={{ marginTop: '2rem' }}>
            {kbDocs.map((d) => (
              <Link key={d.id} className="card" to={`/topics/${d.id}`}>
                <h3>{d.title}</h3>
                <p>{d.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

