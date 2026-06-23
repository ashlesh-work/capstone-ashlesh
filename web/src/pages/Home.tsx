import { Link } from 'react-router-dom';
import { getKbDocs } from '../content/kb';
import { useI18n } from '../i18n/useI18n';

export function Home() {
  const { t, lang } = useI18n();
  const kbDocs = getKbDocs(lang);

  return (
    <>
      <section className="tile tile--brand">
        <div className="container">
          <h1>{t.heroTitle}</h1>
          <p style={{ fontSize: '1.5rem', maxWidth: '40ch' }}>
            {t.appDescription}
          </p>
          <p style={{ marginTop: '1.5rem' }}>
            <Link className="btn btn--primary" to="/topics">
              {t.browseTopics}
            </Link>
          </p>
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
