import { useParams, Link } from 'react-router-dom';
import { getDoc } from '../content/kb';
import { Markdown } from '../components/Markdown';
import { PageToolbar } from '../components/PageToolbar';
import { useI18n } from '../i18n/useI18n';

export function Topic() {
  const { id = '' } = useParams();
  const { t, lang } = useI18n();
  const doc = getDoc(id, lang);


  if (!doc) {
    return (
      <section className="tile">
        <div className="container">
          <h1>{t.topicNotFound}</h1>
          <p>
            {t.topicNotFoundDesc} <Link to="/topics">{t.backToTopics}</Link>.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageToolbar doc={doc} />
      <section className="tile">
        <div className="container prose" style={{ fontSize: 'var(--prose-size)' }}>
          <h1>{doc.title}</h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--ink-muted)' }}>{doc.summary}</p>

          <Markdown source={doc.body} />

          {doc.signoffRequired && (
            <p className="signoff-note">
              <strong>Note:</strong> {t.signoffNote}
            </p>
          )}

          <a className="source-link" href={doc.sourceUrl} target="_blank" rel="noreferrer">
            {t.sourceLabel} {doc.sourceTitle} {t.opensNewTab}
          </a>
        </div>
      </section>
    </>
  );
}
