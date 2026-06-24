import { createHash } from 'node:crypto';

import type { ArchiveImageRecord, NewspaperCardRecord, VideoCardRecord } from './archive';
import { getImageLinks, getPaperHighResUrl, getPaperLinks } from './archive';
import { getBindings } from './db';

export type PaperstackMediaKind = 'newspaper' | 'image' | 'video';

interface MediaTarget {
  key: string;
  remoteUrl: string;
}

const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const MEDIA_CACHE_VERSION = 'v2';
const ALLOWED_MEDIA_HOST_SUFFIXES = [
  'archive.org',
  'bnf.fr',
  'qdl.qa',
  'si.edu',
  'loc.gov',
  's-asian.cam.ac.uk',
  'ytimg.com',
  'ggpht.com',
  'googleusercontent.com',
] as const;

function buildMediaHash(kind: PaperstackMediaKind, archiveId: string, remoteUrl: string): string {
  return createHash('sha1')
    .update(`${MEDIA_CACHE_VERSION}:${kind}:${archiveId}:${remoteUrl}`)
    .digest('hex');
}

function contentTypeToExtension(contentType: string | null, remoteUrl: string): string {
  const normalized = (contentType ?? '').toLowerCase();
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('avif')) return 'avif';
  if (normalized.includes('svg')) return 'svg';

  const urlPath = remoteUrl.split('?')[0] ?? '';
  const extension = urlPath.split('.').pop()?.toLowerCase();
  if (extension && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'].includes(extension)) {
    return extension === 'jpeg' ? 'jpg' : extension;
  }

  return 'jpg';
}

function isAllowedRemoteUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_MEDIA_HOST_SUFFIXES.some((suffix) => parsed.hostname === suffix || parsed.hostname.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

function normalizeRemoteUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isAllowedRemoteUrl(trimmed) ? trimmed : null;
}

function toNewspaperRecord(row: Record<string, unknown>): NewspaperCardRecord {
  return {
    id: Number(row.id ?? 0),
    source: String(row.source ?? ''),
    title: String(row.title ?? ''),
    country: row.country as string | null,
    region: row.region as string | null,
    publication_date: row.publication_date as string | null,
    language: row.language as string | null,
    image_url: row.image_url as string | null,
    page_url: row.page_url as string | null,
    summary: row.summary as string | null,
    event_id: row.event_id as string | null,
    event_name: row.event_name as string | null,
    archive_id: String(row.archive_id ?? ''),
    metadata_json: row.metadata_json as string | null,
    translated_title: row.translated_title as string | null,
    translated_summary: row.translated_summary as string | null,
    translation_language: row.translation_language as string | null,
    translation_model: row.translation_model as string | null,
  };
}

function toImageRecord(row: Record<string, unknown>): ArchiveImageRecord {
  return {
    id: Number(row.id ?? 0),
    source: String(row.source ?? ''),
    title: String(row.title ?? ''),
    description: row.description as string | null,
    country: row.country as string | null,
    region: row.region as string | null,
    image_date: row.image_date as string | null,
    language: row.language as string | null,
    preview_url: row.preview_url as string | null,
    image_url: row.image_url as string | null,
    page_url: row.page_url as string | null,
    rights: row.rights as string | null,
    archive_id: String(row.archive_id ?? ''),
    event_id: row.event_id as string | null,
    event_name: row.event_name as string | null,
    metadata_json: row.metadata_json as string | null,
    translated_title: row.translated_title as string | null,
    translated_description: row.translated_description as string | null,
    translation_language: row.translation_language as string | null,
    translation_model: row.translation_model as string | null,
  };
}

function toVideoRecord(row: Record<string, unknown>): VideoCardRecord {
  return {
    id: Number(row.id ?? 0),
    source: String(row.source ?? ''),
    title: String(row.title ?? ''),
    description: row.description as string | null,
    country: row.country as string | null,
    region: row.region as string | null,
    video_date: row.video_date as string | null,
    duration_seconds: row.duration_seconds as number | null,
    video_url: row.video_url as string | null,
    thumbnail_url: row.thumbnail_url as string | null,
    archive_id: String(row.archive_id ?? ''),
    tags: row.tags as string | null,
    language: row.language as string | null,
    event_id: row.event_id as string | null,
    event_name: row.event_name as string | null,
    metadata_json: row.metadata_json as string | null,
    translated_title: row.translated_title as string | null,
    translated_description: row.translated_description as string | null,
    translation_language: row.translation_language as string | null,
    translation_model: row.translation_model as string | null,
  };
}

function buildMediaTarget(
  kind: PaperstackMediaKind,
  archiveId: string,
  remoteUrl: string,
  contentType: string | null = null,
): MediaTarget {
  const extension = contentTypeToExtension(contentType, remoteUrl);
  return {
    key: `${kind}/${buildMediaHash(kind, archiveId, remoteUrl)}.${extension}`,
    remoteUrl,
  };
}

async function resolveNewspaperMediaTarget(db: D1Database, archiveId: string): Promise<MediaTarget | null> {
  const row = await db
    .prepare(
      `SELECT id, source, title, country, region, publication_date, language, image_url,
              page_url, summary, event_name, archive_id, metadata_json,
              translated_title, translated_summary, translation_language, translation_model
       FROM raw_newspapers
       WHERE archive_id = ?
       LIMIT 1`,
    )
    .bind(archiveId)
    .first<Record<string, unknown>>();

  if (!row) return null;

  const record = toNewspaperRecord(row);
  const remoteUrl =
    normalizeRemoteUrl(getPaperHighResUrl(record))
    ?? normalizeRemoteUrl(getPaperLinks(record).imageUrl);

  return remoteUrl ? buildMediaTarget('newspaper', archiveId, remoteUrl) : null;
}

async function resolveImageMediaTarget(db: D1Database, archiveId: string): Promise<MediaTarget | null> {
  const row = await db
    .prepare(
      `SELECT id, source, title, description, country, region, image_date, language,
              preview_url, image_url, page_url, rights, archive_id, event_id, event_name, metadata_json,
              translated_title, translated_description, translation_language, translation_model
       FROM archive_images
       WHERE archive_id = ?
       LIMIT 1`,
    )
    .bind(archiveId)
    .first<Record<string, unknown>>();

  if (!row) return null;

  const record = toImageRecord(row);
  const links = getImageLinks(record);
  const remoteUrl = normalizeRemoteUrl(links.imageUrl) ?? normalizeRemoteUrl(links.previewUrl);
  return remoteUrl ? buildMediaTarget('image', archiveId, remoteUrl) : null;
}

async function resolveVideoMediaTarget(db: D1Database, archiveId: string): Promise<MediaTarget | null> {
  const row = await db
    .prepare(
      `SELECT id, source, title, description, country, region, video_date, duration_seconds,
              video_url, thumbnail_url, archive_id, tags, language, event_id, event_name, metadata_json,
              translated_title, translated_description, translation_language, translation_model
       FROM archive_videos
       WHERE archive_id = ?
       LIMIT 1`,
    )
    .bind(archiveId)
    .first<Record<string, unknown>>();

  if (!row) return null;

  const record = toVideoRecord(row);
  const remoteUrl = normalizeRemoteUrl(record.thumbnail_url);
  return remoteUrl ? buildMediaTarget('video', archiveId, remoteUrl) : null;
}

async function resolveMediaTarget(
  db: D1Database,
  kind: PaperstackMediaKind,
  archiveId: string,
): Promise<MediaTarget | null> {
  switch (kind) {
    case 'newspaper':
      return resolveNewspaperMediaTarget(db, archiveId);
    case 'image':
      return resolveImageMediaTarget(db, archiveId);
    case 'video':
      return resolveVideoMediaTarget(db, archiveId);
    default:
      return null;
  }
}

function responseFromObject(object: R2ObjectBody, cacheStatus: 'hit' | 'miss'): Response {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('cache-control', CACHE_CONTROL);
  headers.set('etag', object.httpEtag);
  headers.set('x-paperstack-cache', cacheStatus);
  return new Response(object.body, { headers });
}

export function buildMediaProxyUrl(kind: PaperstackMediaKind, archiveId: string): string {
  return `/api/media/${kind}/${encodeURIComponent(archiveId)}`;
}

export async function streamCachedMedia(kind: PaperstackMediaKind, archiveId: string): Promise<Response> {
  const env = getBindings();
  const target = await resolveMediaTarget(env.DB, kind, archiveId);

  if (!target) {
    return new Response('Media not found.', { status: 404 });
  }

  const cached = await env.PAPERSTACK_MEDIA.get(target.key);
  if (cached) {
    return responseFromObject(cached, 'hit');
  }

  const upstream = await fetch(target.remoteUrl, {
    headers: {
      Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      'User-Agent': 'Paperstack Media Cache/1.0 (+https://paperstack.yrasool.workers.dev)',
    },
    redirect: 'follow',
  });

  if (!upstream.ok) {
    return Response.redirect(target.remoteUrl, 302);
  }

  const contentType = upstream.headers.get('content-type');
  const normalizedContentType = contentType ?? 'image/jpeg';
  if (!(contentType ?? '').toLowerCase().startsWith('image/')) {
    return Response.redirect(target.remoteUrl, 302);
  }

  const body = await upstream.arrayBuffer();
  const cacheTarget = buildMediaTarget(kind, archiveId, target.remoteUrl, contentType);

  await env.PAPERSTACK_MEDIA.put(cacheTarget.key, body, {
    httpMetadata: {
      contentType: normalizedContentType,
      cacheControl: CACHE_CONTROL,
    },
    customMetadata: {
      archiveId,
      remoteUrl: target.remoteUrl,
    },
  });

  const stored = await env.PAPERSTACK_MEDIA.get(cacheTarget.key);
  if (stored) {
    return responseFromObject(stored, 'miss');
  }

  return new Response(body, {
    headers: {
      'cache-control': CACHE_CONTROL,
      'content-type': normalizedContentType,
      'x-paperstack-cache': 'miss',
    },
  });
}
