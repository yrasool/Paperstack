import Link from 'next/link';

export default function NotFound(): JSX.Element {
  return (
    <main className="page-shell">
      <section className="section">
        <div className="section__header">
          <div>
            <p className="section__eyebrow">Not found</p>
            <h1 className="section__title">This archive page does not exist</h1>
            <p className="section__copy">
              The item or route you requested is unavailable in the current Paperstack build.
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
