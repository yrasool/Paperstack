import Link from 'next/link';

import ArchiveBackgroundScene from '@/components/ArchiveBackgroundScene';
import PaperCard from '@/components/PaperCard';
import {
  buildHref,
  getArchiveHomeData,
  parseFilters,
} from '@/lib/archive';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;

interface HomePageProps {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}

const DECADE_OPTIONS = [
  { label: 'All Eras', value: '' },
  { label: '1890s', value: '1890' },
  { label: '1910s', value: '1910' },
  { label: '1920s', value: '1920' },
  { label: '1930s', value: '1930' },
  { label: '1940s', value: '1940' },
  { label: '1950s', value: '1950' },
  { label: '1960s', value: '1960' },
  { label: '1970s', value: '1970' },
] as const;

const ALLOWED_DECADE_VALUES = new Set<string>(
  DECADE_OPTIONS.map((option) => option.value).filter(Boolean),
);

export default async function HomePage({ searchParams }: HomePageProps) {
  const parsedFilters = parseFilters(await searchParams);
  const filters = ALLOWED_DECADE_VALUES.has(parsedFilters.decade) || !parsedFilters.decade
    ? parsedFilters
    : { ...parsedFilters, decade: '', page: 1 };
  let data;

  try {
    data = await getArchiveHomeData(filters);
  } catch (error) {
    console.error('Paperstack homepage data load failed', {
      filters,
      error,
    });

    return (
      <main className="page-shell">
        <section className="section">
          <div className="section__header">
            <div>
              <p className="section__eyebrow">Paperstack</p>
              <h1 className="section__title">Archive data temporarily unavailable</h1>
              <p className="section__copy">
                The archive request failed while loading this decade view. Try another decade or refresh in a moment.
              </p>
            </div>
          </div>
          <div className="empty-state">
            The homepage data query failed for this request. The failure is being logged so the archive filters can be corrected.
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <ArchiveBackgroundScene />
      <main className="page-shell">
        <div className="top-ribbon">
          <div className="top-ribbon__links">
            {DECADE_OPTIONS.map((option) => (
              <Link
                key={option.label}
                href={buildHref(filters, { decade: option.value, year: '', page: 1 })}
                className={`chip-link ${filters.decade === option.value && !filters.year ? 'is-active' : ''}`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </div>
        <section className="hero">
          <div className="hero__grid">
            <div className="hero__copy">
              <p className="hero__eyebrow">Decade archive</p>
              <h1 className="hero__headline">Paperstack</h1>
              <p className="hero__subhead">Browse historical newspapers and primary-source scans by decade.</p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section__header">
            <div>
              <p className="section__eyebrow">Featured newspaper wall</p>
              <h2 className="section__title">
                {data.selectedEvent ? `${data.selectedEvent.title}: front pages and issue scans` : 'Decade-linked front pages'}
              </h2>
            </div>
          </div>

        {data.featured.data.length === 0 ? (
          <div className="empty-state">
            No featured papers matched the current filter.
          </div>
        ) : (
          <div className="papers-grid">
            {data.featured.data.map((record, index) => (
              <PaperCard key={record.archive_id} record={record} priority={index < 4} />
            ))}
          </div>
        )}

        <div className="pagination">
          <div className="pagination__label">
            Page {data.featured.page} of {data.featured.pages}
          </div>
          <div className="pagination__actions">
            {data.featured.page > 1 ? (
              <Link
                href={buildHref(filters, { page: data.featured.page - 1 })}
                className="button-link button-link--ghost"
              >
                Previous
              </Link>
            ) : null}
            {data.featured.page < data.featured.pages ? (
              <Link
                href={buildHref(filters, { page: data.featured.page + 1 })}
                className="button-link"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
        </section>

      </main>
    </>
  );
}
