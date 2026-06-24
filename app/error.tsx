'use client';

import Link from 'next/link';

export default function ErrorPage(): JSX.Element {
  return (
    <main className="page-shell">
      <section className="section">
        <div className="section__header">
          <div>
            <p className="section__eyebrow">Paperstack Archive</p>
            <h1 className="section__title">A temporary archive error interrupted this page</h1>
            <p className="section__copy">
              Return to the archive wall and continue browsing newspapers, archival images, and
              newsreels.
            </p>
          </div>
        </div>

        <div className="pagination__actions">
          <Link href="/" className="button-link">
            Return to archive
          </Link>
        </div>
      </section>
    </main>
  );
}
