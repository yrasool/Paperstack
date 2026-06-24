import type { NewspaperCardRecord } from '../lib/archive';
import {
  formatArchiveDate,
  getPaperDisplayTitle,
  getPaperHighResUrl,
  getPaperLinks,
  repairText,
} from '../lib/archive';
import { buildMediaProxyUrl } from '../lib/media';

interface PaperCardProps {
  record: NewspaperCardRecord;
  priority?: boolean;
}

export default function PaperCard({ record, priority = false }: PaperCardProps) {
  const { pageUrl, imageUrl } = getPaperLinks(record);
  const highResUrl = getPaperHighResUrl(record);
  const title = getPaperDisplayTitle(record);
  const source = repairText(record.source);
  const language = repairText(record.language);
  const mediaKind = record.media_kind ?? 'newspaper';
  const cachedImageUrl = imageUrl || highResUrl
    ? buildMediaProxyUrl(mediaKind, record.archive_id)
    : null;

  return (
    <article className="paper-card paper-card--wall">
      <div className="paper-card__topline">
        <div className="paper-card__eyebrow">
          <span className="paper-card__source">{source}</span>
          <span className="meta-dot" />
          <span>{formatArchiveDate(record.publication_date)}</span>
        </div>
        {language ? <span className="chip chip--soft">{language}</span> : null}
      </div>

      <div className="paper-card__title-wrap">
        <h2 className="paper-card__title">{title}</h2>
      </div>

      <div className="paper-image-frame paper-image-frame--wall">
        {cachedImageUrl ? (
          <img
            src={cachedImageUrl}
            alt={title}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className="paper-image"
          />
        ) : (
          <div className="paper-image paper-image--empty">Preview unavailable</div>
        )}
      </div>

      <div className="paper-card__footer">
        {pageUrl ? (
          <a href={pageUrl} target="_blank" rel="noreferrer" className="button-link">
            Open issue
          </a>
        ) : null}
        {highResUrl ? (
          <a href={highResUrl} target="_blank" rel="noreferrer" className="button-link button-link--ghost">
            Open scan
          </a>
        ) : null}
      </div>
    </article>
  );
}
