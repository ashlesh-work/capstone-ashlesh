import { Link } from 'react-router-dom';
import { getKbDocs } from '../content/kb';
import { useI18n } from '../i18n/useI18n';

export function Topics() {
  const { t, lang } = useI18n();
  const kbDocs = getKbDocs(lang);

  return (
    <section className="tile">
      <div className="container">
        <h1>{t.allTopics}</h1>
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
  );
}
