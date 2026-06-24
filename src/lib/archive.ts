import { Buffer } from 'node:buffer';

import { getBindings } from './db';
import {
  getHistoricalEventBySlug,
  MAJOR_HISTORICAL_EVENTS,
  resolveHistoricalEvent,
  type HistoricalEventDefinition,
} from './historicalEvents';

export interface SourceCount {
  value: string;
  count: number;
}

export interface NewspaperCardRecord {
  id: number;
  source: string;
  title: string;
  country: string | null;
  region: string | null;
  publication_date: string | null;
  language: string | null;
  image_url: string | null;
  page_url: string | null;
  summary: string | null;
  event_id: string | null;
  event_name: string | null;
  archive_id: string;
  metadata_json: string | null;
  translated_title: string | null;
  translated_summary: string | null;
  translation_language: string | null;
  translation_model: string | null;
  media_kind?: 'newspaper' | 'image';
  event_slug?: string | null;
  quality_score?: number;
}

export interface ArchiveImageRecord {
  id: number;
  source: string;
  title: string;
  description: string | null;
  country: string | null;
  region: string | null;
  image_date: string | null;
  language: string | null;
  preview_url: string | null;
  image_url: string | null;
  page_url: string | null;
  rights: string | null;
  archive_id: string;
  event_id?: string | null;
  event_name?: string | null;
  event_slug?: string | null;
  translated_title?: string | null;
  translated_description?: string | null;
  translation_language?: string | null;
  translation_model?: string | null;
  metadata_json: string | null;
  quality_score?: number;
}

export interface VideoCardRecord {
  id: number;
  source: string;
  title: string;
  description: string | null;
  country: string | null;
  region: string | null;
  video_date: string | null;
  duration_seconds: number | null;
  video_url: string | null;
  thumbnail_url: string | null;
  archive_id: string;
  tags: string | null;
  language: string | null;
  event_id?: string | null;
  event_name?: string | null;
  event_slug?: string | null;
  translated_title?: string | null;
  translated_description?: string | null;
  translation_language?: string | null;
  translation_model?: string | null;
  metadata_json: string | null;
}

export interface HistoricalEventCard {
  slug: string;
  title: string;
  periodLabel: string;
  summary: string;
  paperCount: number;
  imageCount: number;
  videoCount: number;
  totalCount: number;
  leadMediaKind: 'newspaper' | 'image' | 'video' | null;
  leadArchiveId: string | null;
}

interface EventAggregateRow {
  slug: string;
  count: number;
  lead_archive_id: string | null;
}

export interface ArchiveSummary {
  totalPapers: number;
  imageBackedPapers: number;
  textOnlyPapers: number;
  totalImages: number;
  totalVideos: number;
}

export interface ArchiveFilters {
  q: string;
  source: string;
  year: string;
  decade: string;
  event: string;
  page: number;
}

export interface ArchiveHomeData {
  filters: ArchiveFilters;
  summary: ArchiveSummary;
  sources: SourceCount[];
  selectedEvent: HistoricalEventDefinition | null;
  majorEvents: HistoricalEventCard[];
  featured: {
    data: NewspaperCardRecord[];
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
  images: ArchiveImageRecord[];
  textOnly: NewspaperCardRecord[];
  videos: VideoCardRecord[];
}

const FEATURED_LIMIT = 8;
const TEXT_ONLY_LIMIT = 10;
const IMAGE_LIMIT = 6;
const FEATURED_CANDIDATE_LIMIT = 48;
const TEXT_CANDIDATE_LIMIT = 0;
const IMAGE_CANDIDATE_LIMIT = 48;

function escapeSqlLikePhrase(phrase: string): string {
  return phrase.replace(/'/g, "''");
}

function buildLikeSql(columns: readonly string[], phrases: readonly string[]): string {
  const clauses = columns.flatMap((column) =>
    phrases.map((phrase) => `LOWER(COALESCE(${column}, '')) LIKE '%${escapeSqlLikePhrase(phrase)}%'`),
  );

  return `(
    ${clauses.join('\n    OR ')}
  )`;
}

function buildBlobLikeSql(blobSql: string, phrases: readonly string[]): string {
  const clauses = phrases.map(
    (phrase) => `${blobSql} LIKE '%${escapeSqlLikePhrase(phrase)}%'`,
  );

  return `(
    ${clauses.join('\n    OR ')}
  )`;
}

const HISTORICAL_EVENT_PHRASES = [
  'world war i',
  'world war 1',
  'world war ii',
  'world war 2',
  'great depression',
  'hiroshima',
  'nagasaki',
  'india independence',
  'partition',
  'arab-israeli',
  'arab israeli',
  'korean war',
  'suez crisis',
  'suez canal',
  'cuban missile crisis',
  'vietnam war',
  'six-day war',
  'six day war',
  'civil rights movement',
  'bangladesh liberation',
  'bangladesh war',
  'yom kippur',
  'oil crisis',
  'iranian revolution',
  'iran-iraq war',
  'iran iraq war',
  'soviet-afghan war',
  'soviet afghan war',
  'falklands war',
  'chernobyl',
  'tiananmen',
  'berlin wall',
  'fall of the berlin wall',
  'gulf war',
  'desert storm',
  'yugoslav wars',
  'bosnian war',
  'bosnia',
  'kosovo war',
  'first intifada',
  'intifada',
  'oklahoma city bombing',
  'kargil war',
  'jfk assassination',
  'kennedy assassination',
  'cultural revolution',
  'hungarian revolution',
  'iran hostage crisis',
  'black panther',
  'operation desert storm',
] as const;

const LATE_DECADE_EVENT_PHRASES = [
  'vietnam war',
  'civil rights',
  'bangladesh',
  'yom kippur',
  'oil crisis',
  'iranian revolution',
  'iran-iraq',
  'soviet-afghan',
  'falklands',
  'chernobyl',
  'tiananmen',
  'berlin wall',
  'desert storm',
  'gulf war',
  'yugoslav',
  'bosnia',
  'kosovo',
  'intifada',
  'kargil',
  'oklahoma city bombing',
] as const;

const VIDEO_EVENT_TEXT_PHRASES = [
  ...HISTORICAL_EVENT_PHRASES,
  'newsreel',
  'archive footage',
  'assassination',
] as const;

const NEWSPAPER_TITLE_PHRASES = [
  'times',
  'post',
  'news',
  'daily',
  'tribune',
  'herald',
  'star',
  'gazette',
  'chronicle',
  'mail',
  'express',
  'globe',
  'telegraph',
  'mirror',
  'sun',
  'sentinel',
  'register',
  'nachrichten',
  'echo',
] as const;

const NEWSPAPERISH_PHRASES = NEWSPAPER_TITLE_PHRASES;

const PAPER_TEXT_BLOB_SQL = "LOWER(COALESCE(title, '') || ' ' || COALESCE(summary, ''))";
const IMAGE_TEXT_BLOB_SQL = "LOWER(COALESCE(title, '') || ' ' || COALESCE(description, ''))";
const VIDEO_TEXT_BLOB_SQL = "LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, ''))";
const METADATA_TEXT_BLOB_SQL = "LOWER(COALESCE(metadata_json, ''))";

const NON_NEWSPAPER_DOCUMENT_PHRASES = [
  'autobiography',
  'memoir',
  'memoirs',
  'memoire',
  'mémoire',
  'correspondence',
  'correspondance',
  'letters',
  'letter',
  'lettre',
  'lettres',
  'proceedings',
  'bulletin',
  'bulletin hebdomadaire',
  'bulletin mensuel',
  'acta',
  'comptes rendus',
  'proces-verbal',
  'procès-verbal',
  'revue',
  'review',
  'research',
  'development',
  'stratégies',
  'géographies',
  'idéologies',
  'bibliography',
  'catalogue',
  'catalog',
  'quarterly',
  'monthly',
  'newsletter',
  'annals',
  'transactions',
  'minutes',
  'manual',
  'biography',
  'biographies',
  'diary',
  'diaries',
  'recollections',
  'scrapbook',
  'annual report',
  'rapport annuel',
  'report of',
  'hebdomadaire',
  'mensuel',
  'trimestriel',
  'textbook',
  'working party',
  'official committee',
  'country by country studies',
  'reconstruction',
  'contains papers relating to',
  'papers relating to',
  'country studies',
  'college',
  'yearbook',
  'photograph',
  'photographie',
  'photogr',
  'donateur',
  'phoverre',
  'voiture du gouverneur',
  'grue flottante',
] as const;

const VIDEO_JUNK_PHRASES = [
  'interview:',
  'songs',
  'playlist',
  'lecture',
  'seminar',
  'conference',
  'music band',
  'radio show',
  'radio archive',
  'wrestling',
  'anime',
  'tv series',
  'episode',
  'literature',
  'politics and prose',
  'live at ',
  'space: above and beyond',
  'science fiction',
  'oral history',
  'anthology',
  'three books',
  'printed world',
  'high interest reading',
  'books on literature',
  'evangelion',
  'transcript available below',
  'speaker',
  'music documentary',
  'war songs',
  'mary mason',
  'wangjaesan',
  'webm version',
  'irregular warfare',
  'audio only',
  'radio transcription',
  'book talk',
  'memorial service',
  'college lecture',
  'panel discussion',
] as const;

const POSITIVE_VIDEO_COLLECTION_PHRASES = [
  'universal_newsreels',
  'newsandpublicaffairs',
  'prelinger',
] as const;

const NEGATIVE_VIDEO_COLLECTION_PHRASES = [
  'opensource_image',
  'radioprograms',
  'airchecks',
  'airchecks-misc',
] as const;

function getPositiveVideoCollectionSql(): string {
  return buildBlobLikeSql(METADATA_TEXT_BLOB_SQL, POSITIVE_VIDEO_COLLECTION_PHRASES);
}

function getNegativeVideoCollectionSql(): string {
  return buildBlobLikeSql(METADATA_TEXT_BLOB_SQL, NEGATIVE_VIDEO_COLLECTION_PHRASES);
}

const FEATURED_SOURCE_ORDER_SQL = `
  CASE
    WHEN source = 'Chronicling America' THEN 0
    WHEN source = 'Library of Congress' THEN 1
    WHEN source = 'Gallica' THEN 2
    WHEN source = 'Internet Archive' THEN 3
    WHEN source = 'Smithsonian' THEN 4
    WHEN source = 'Japan NDL' THEN 5
    ELSE 7
  END
`;

const TEXT_SOURCE_ORDER_SQL = `
  CASE
    WHEN source = 'Japan NDL' THEN 0
    WHEN source = 'Smithsonian Text Archives' THEN 1
    WHEN source = 'Smithsonian' THEN 2
    WHEN source = 'Cambridge South Asian Newspaper Holdings' THEN 3
    WHEN source = 'Cambridge South Asian Papers' THEN 4
    ELSE 5
  END
`;

const IMAGE_SOURCE_ORDER_SQL = `
  CASE
    WHEN source = 'Smithsonian Open Images' THEN 0
    WHEN source = 'Chronicling America' THEN 1
    WHEN source = 'Endangered Archives Programme' THEN 2
    WHEN source = 'Cambridge South Asian Films' THEN 3
    WHEN source = 'Smithsonian' THEN 4
    WHEN source = 'Gallica' THEN 5
    WHEN source = 'Internet Archive' THEN 6
    ELSE 8
  END
`;

const VIDEO_SOURCE_ORDER_SQL = `
  CASE
    WHEN source = 'AP Archive (YouTube)' THEN 0
    WHEN source = 'British Movietone (YouTube)' THEN 1
    WHEN source = 'Smithsonian Open Video' THEN 2
    WHEN source = 'Internet Archive Videos' THEN 3
    WHEN source = 'Cambridge South Asian Films' THEN 4
    WHEN source = 'British Pathe' THEN 5
    WHEN source = 'CriticalPast' THEN 6
    ELSE 7
  END
`;

const STORED_EVENT_PRIORITY_SQL = `
  CASE
    WHEN LENGTH(TRIM(COALESCE(event_id, ''))) > 0 THEN 2
    WHEN LENGTH(TRIM(COALESCE(event_name, ''))) > 0 THEN 1
    ELSE 0
  END
`;

const GENERIC_PERIODICAL_TITLE_SQL = `
  (
    LOWER(COALESCE(title, '')) LIKE 'ark:/%'
    OR LOWER(COALESCE(title, '')) LIKE '%bulletin%'
    OR LOWER(COALESCE(title, '')) LIKE '%acta%'
    OR LOWER(COALESCE(title, '')) LIKE '%comptes rendus%'
    OR LOWER(COALESCE(title, '')) LIKE '%revue%'
    OR LOWER(COALESCE(title, '')) LIKE '%academie%'
    OR LOWER(COALESCE(title, '')) LIKE '%techniques%'
    OR LOWER(COALESCE(title, '')) LIKE '%municipales%'
    OR LOWER(COALESCE(title, '')) LIKE '%publication mensuelle%'
    OR LOWER(COALESCE(title, '')) LIKE '%herodote%'
    OR LOWER(COALESCE(title, '')) LIKE '%geographie%'
    OR LOWER(COALESCE(title, '')) LIKE '%geopolitique%'
    OR LOWER(COALESCE(title, '')) LIKE '%officier%'
    OR LOWER(COALESCE(title, '')) LIKE '%armee du salut%'
    OR LOWER(COALESCE(title, '')) LIKE '%quart-monde%'
    OR LOWER(COALESCE(title, '')) LIKE '%jeunesse%'
    OR LOWER(COALESCE(title, '')) LIKE '%plantations%'
    OR LOWER(COALESCE(title, '')) LIKE '%telescope%'
    OR LOWER(COALESCE(title, '')) LIKE '%convergence%'
  )
`;

const LATE_GALLICA_PERIODICAL_SQL = `
  (
    source = 'Gallica'
    AND publication_date >= '1970-01-01'
    AND ${GENERIC_PERIODICAL_TITLE_SQL}
  )
`;

const LATE_GALLICA_IMAGE_SQL = `
  (
    source = 'Gallica'
    AND image_date >= '1970-01-01'
    AND ${GENERIC_PERIODICAL_TITLE_SQL}
  )
`;

const REAL_VIDEO_THUMBNAIL_SQL = `
  (
    LENGTH(TRIM(COALESCE(thumbnail_url, ''))) > 0
    AND (
      source <> 'Internet Archive Videos'
      OR LOWER(COALESCE(metadata_json, '')) LIKE '%"image":%'
      OR LOWER(COALESCE(metadata_json, '')) LIKE '%"thumbnail":%'
    )
  )
`;

const EVENTFUL_PAPER_TEXT_SQL = `
  ${buildBlobLikeSql(PAPER_TEXT_BLOB_SQL, LATE_DECADE_EVENT_PHRASES)}
`;

const EVENTFUL_IMAGE_TEXT_SQL = `
  ${buildBlobLikeSql(
    IMAGE_TEXT_BLOB_SQL,
    [...LATE_DECADE_EVENT_PHRASES, 'photograph of general colin l. powell'],
  )}
`;

const EVENTFUL_VIDEO_TEXT_SQL = `
  ${buildBlobLikeSql(
    VIDEO_TEXT_BLOB_SQL,
    [...LATE_DECADE_EVENT_PHRASES, 'newsreel', 'documentary footage', 'archival footage'],
  )}
`;

const STRONG_EVENTFUL_VIDEO_SQL = `
  ${buildBlobLikeSql(
    VIDEO_TEXT_BLOB_SQL,
    [...LATE_DECADE_EVENT_PHRASES, 'newsreel', 'documentary footage'],
  )}
`;

const JUNK_VIDEO_SQL = `
  (
    source = 'Cambridge South Asian Audio'
    OR (
      source IN ('AP Archive (YouTube)', 'British Movietone (YouTube)')
      AND video_date >= '2010-01-01'
      AND NOT ${STRONG_EVENTFUL_VIDEO_SQL}
      AND LOWER(COALESCE(title, '')) NOT LIKE '%archive footage%'
      AND LOWER(COALESCE(description, '')) NOT LIKE '%archive footage%'
      AND LOWER(COALESCE(title, '')) NOT LIKE '%from the archives%'
      AND LOWER(COALESCE(description, '')) NOT LIKE '%from the archives%'
      AND LOWER(COALESCE(title, '')) NOT LIKE '%newsreel%'
      AND LOWER(COALESCE(description, '')) NOT LIKE '%newsreel%'
      AND LOWER(COALESCE(title, '')) NOT LIKE '%historical%'
      AND LOWER(COALESCE(description, '')) NOT LIKE '%historical%'
    )
    OR (
      source = 'Smithsonian Open Video'
      AND (
        LOWER(COALESCE(video_url, '')) LIKE 'https://www.si.edu/object/%'
        OR LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, '')) LIKE '%postcard%'
        OR LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, '')) LIKE '%bottle%'
        OR LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, '')) LIKE '%paperboard%'
        OR LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, '')) LIKE '%glass bottle%'
        OR (
          LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, '')) NOT GLOB '*video*'
          AND LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, '')) NOT GLOB '*film*'
          AND LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, '')) NOT GLOB '*moving image*'
          AND LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, '')) NOT GLOB '*newsreel*'
          AND LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, '')) NOT GLOB '*broadcast*'
          AND LOWER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, '')) NOT GLOB '*television*'
        )
      )
    )
    OR ${buildBlobLikeSql(VIDEO_TEXT_BLOB_SQL, VIDEO_JUNK_PHRASES)}
    OR LOWER(COALESCE(description, '')) LIKE '%science fiction television series%'
    OR TRIM(COALESCE(title, '')) GLOB '[0-9][0-9][0-9][0-9]'
    OR LOWER(COALESCE(metadata_json, '')) LIKE '%"mediatype":"texts"%'
    OR LOWER(COALESCE(metadata_json, '')) LIKE '%"mediatype": "texts"%'
    OR ${getNegativeVideoCollectionSql()}
  )
`;

const NEWSPAPERISH_PAPER_TEXT_SQL = `
  ${buildBlobLikeSql(PAPER_TEXT_BLOB_SQL, NEWSPAPER_TITLE_PHRASES)}
`;

const PAPER_NEWSPAPER_EVIDENCE_SQL = `
  (
    source IN ('Chronicling America', 'Library of Congress')
    OR ${NEWSPAPERISH_PAPER_TEXT_SQL}
    OR LOWER(COALESCE(metadata_json, '')) LIKE '%newspaper%'
  )
`;

const NON_NEWSPAPER_DOCUMENT_SQL = `
  ${buildBlobLikeSql(PAPER_TEXT_BLOB_SQL, NON_NEWSPAPER_DOCUMENT_PHRASES)}
`;

const GALLICA_NON_NEWSPAPER_OBJECT_SQL = `
  (
    source = 'Gallica'
    AND NOT ${NEWSPAPERISH_PAPER_TEXT_SQL}
    AND (
      LOWER(COALESCE(title, '')) LIKE '%photograph%'
      OR LOWER(COALESCE(title, '')) LIKE '%photographie%'
      OR LOWER(COALESCE(title, '')) LIKE '%photogr%'
      OR LOWER(COALESCE(title, '')) LIKE '%donateur%'
      OR LOWER(COALESCE(title, '')) LIKE '%phoverre%'
      OR LOWER(COALESCE(title, '')) LIKE '%voiture du gouverneur%'
      OR LOWER(COALESCE(title, '')) LIKE '%grue flottante%'
      OR LOWER(COALESCE(summary, '')) LIKE '%photograph%'
      OR LOWER(COALESCE(summary, '')) LIKE '%photographie%'
      OR LOWER(COALESCE(summary, '')) LIKE '%appartient%'
      OR LOWER(COALESCE(metadata_json, '')) LIKE '%photograph%'
      OR LOWER(COALESCE(metadata_json, '')) LIKE '%photographie%'
      OR LOWER(COALESCE(metadata_json, '')) LIKE '%phoverre%'
      OR LOWER(COALESCE(archive_id, '')) LIKE 'ark:/12148/btv1b%'
    )
  )
`;

const QDL_FILE_LIKE_DOCUMENT_SQL = `
  (
    source = 'Qatar Digital Library'
    AND (
      LOWER(COALESCE(title, '')) LIKE 'coll %'
      OR LOWER(COALESCE(title, '')) LIKE '%working party%'
      OR LOWER(COALESCE(title, '')) LIKE '%official committee%'
      OR LOWER(COALESCE(title, '')) LIKE '%country by country studies%'
      OR LOWER(COALESCE(title, '')) LIKE '%reconstruction%'
      OR LOWER(COALESCE(summary, '')) LIKE '%contains papers relating to%'
      OR LOWER(COALESCE(summary, '')) LIKE '%papers relating to%'
      OR LOWER(COALESCE(summary, '')) LIKE '%country by country studies%'
      OR LOWER(COALESCE(summary, '')) LIKE '%working party%'
      OR LOWER(COALESCE(summary, '')) LIKE '%official committee%'
    )
  )
`;

const QDL_FILE_LIKE_IMAGE_SQL = `
  (
    source = 'Qatar Digital Library'
    AND (
      LOWER(COALESCE(title, '')) LIKE 'coll %'
      OR LOWER(COALESCE(title, '')) LIKE '%working party%'
      OR LOWER(COALESCE(title, '')) LIKE '%official committee%'
      OR LOWER(COALESCE(title, '')) LIKE '%country by country studies%'
      OR LOWER(COALESCE(title, '')) LIKE '%reconstruction%'
      OR LOWER(COALESCE(description, '')) LIKE '%contains papers relating to%'
      OR LOWER(COALESCE(description, '')) LIKE '%papers relating to%'
      OR LOWER(COALESCE(description, '')) LIKE '%country by country studies%'
      OR LOWER(COALESCE(description, '')) LIKE '%working party%'
      OR LOWER(COALESCE(description, '')) LIKE '%official committee%'
    )
  )
`;


const IMAGE_QUALITY_SQL = `
  (
    CASE
      WHEN source = 'Smithsonian Open Images' THEN 120
      WHEN source = 'Chronicling America' THEN 102
      WHEN source = 'Endangered Archives Programme' THEN 98
      WHEN source = 'Cambridge South Asian Films' THEN 84
      WHEN source = 'Smithsonian' THEN 72
      WHEN source = 'Gallica' THEN 36
      ELSE 0
    END
    + CASE
      WHEN LENGTH(TRIM(COALESCE(event_id, ''))) > 0 OR LENGTH(TRIM(COALESCE(event_name, ''))) > 0 THEN 36
      ELSE 0
    END
    + CASE
      WHEN LENGTH(TRIM(COALESCE(image_url, ''))) > 0 THEN 18
      WHEN LENGTH(TRIM(COALESCE(preview_url, ''))) > 0 THEN 10
      ELSE 0
    END
    + CASE
      WHEN LOWER(COALESCE(title, '')) LIKE '%photograph%' THEN 14
      WHEN LOWER(COALESCE(title, '')) LIKE '%letter%' THEN 10
      WHEN LOWER(COALESCE(title, '')) LIKE '%telegram%' THEN 12
      WHEN LOWER(COALESCE(title, '')) LIKE '%poster%' THEN 10
      WHEN LOWER(COALESCE(title, '')) LIKE '%pamphlet%' THEN 10
      WHEN LOWER(COALESCE(title, '')) LIKE '%protest%' THEN 12
      WHEN ${EVENTFUL_IMAGE_TEXT_SQL} THEN 16
      ELSE 0
    END
    - CASE
      WHEN LOWER(COALESCE(title, '')) LIKE '%bulletin%' THEN 60
      WHEN LOWER(COALESCE(title, '')) LIKE '%acta%' THEN 60
      WHEN LOWER(COALESCE(title, '')) LIKE '%comptes rendus%' THEN 60
      WHEN LOWER(COALESCE(title, '')) LIKE '%revue%' THEN 50
      WHEN LOWER(COALESCE(title, '')) LIKE '%académie%' THEN 50
      WHEN LOWER(COALESCE(title, '')) LIKE '%academie%' THEN 50
      WHEN LOWER(COALESCE(title, '')) LIKE '%société%' THEN 50
      WHEN LOWER(COALESCE(title, '')) LIKE '%societe%' THEN 50
      WHEN LOWER(COALESCE(title, '')) LIKE '%géographie%' THEN 42
      WHEN LOWER(COALESCE(title, '')) LIKE '%geographie%' THEN 42
      WHEN LOWER(COALESCE(title, '')) LIKE '%basketball%' THEN 36
      WHEN LOWER(COALESCE(title, '')) LIKE '%shirt%' THEN 30
      WHEN LOWER(COALESCE(title, '')) LIKE '%uniform%' THEN 28
      WHEN LOWER(COALESCE(title, '')) LIKE '%machine%' THEN 28
      WHEN LOWER(COALESCE(title, '')) LIKE '%margarita%' THEN 28
      WHEN LOWER(COALESCE(title, '')) LIKE '%correspondence%' THEN 22
      WHEN LOWER(COALESCE(title, '')) LIKE '%memoir%' THEN 28
      ELSE 0
    END
    - CASE
      WHEN ${LATE_GALLICA_IMAGE_SQL} THEN 180
      ELSE 0
    END
  )
`;

const SOURCE_LIST_ORDER_SQL = `
  CASE
    WHEN value = 'Gallica' THEN 0
    WHEN value = 'Endangered Archives Programme' THEN 1
    WHEN value = 'Internet Archive' THEN 2
    WHEN value = 'Internet Archive Videos' THEN 3
    WHEN value = 'Cambridge South Asian Films' THEN 4
    WHEN value = 'Cambridge South Asian Audio' THEN 5
    WHEN value = 'Cambridge South Asian Papers' THEN 6
    WHEN value = 'Cambridge South Asian Newspaper Holdings' THEN 7
    WHEN value = 'British Pathe' THEN 8
    WHEN value = 'CriticalPast' THEN 9
    WHEN value = 'Smithsonian Open Images' THEN 10
    WHEN value = 'Smithsonian Text Archives' THEN 11
    WHEN value = 'Smithsonian Open Video' THEN 12
    WHEN value = 'Smithsonian' THEN 13
    WHEN value = 'Japan NDL' THEN 14
    ELSE 16
  END
`;

const INTERNET_ARCHIVE_BASELINE_SQL = `
  (
    source = 'Internet Archive'
    AND publication_date <= '1994-12-31'
    AND LOWER(COALESCE(title, '')) NOT LIKE '%test%'
    AND LOWER(COALESCE(summary, '')) NOT LIKE '%test%'
    AND LOWER(COALESCE(title, '')) NOT LIKE '%family%'
    AND LOWER(COALESCE(summary, '')) NOT LIKE '%family%'
    AND LOWER(COALESCE(title, '')) NOT LIKE '%college%'
    AND LOWER(COALESCE(summary, '')) NOT LIKE '%college%'
    AND LOWER(COALESCE(title, '')) NOT LIKE '%yearbook%'
    AND LOWER(COALESCE(summary, '')) NOT LIKE '%yearbook%'
    AND title NOT GLOB 'WLS_*'
    AND title NOT GLOB '000*'
  )
`;

const FEATURED_QUALITY_SQL = `
  (
    CASE
      WHEN source = 'Chronicling America' THEN 166
      WHEN source = 'Library of Congress' THEN 156
      WHEN source = 'Gallica' THEN 138
      WHEN source = 'Internet Archive' THEN 26
      WHEN source = 'Smithsonian' THEN 8
      WHEN source = 'Japan NDL' THEN 4
      ELSE 0
    END
    + CASE
      WHEN LENGTH(TRIM(COALESCE(event_id, ''))) > 0 OR LENGTH(TRIM(COALESCE(event_name, ''))) > 0 THEN 42
      ELSE 0
    END
    + CASE
      WHEN LENGTH(TRIM(COALESCE(image_url, ''))) > 0 THEN 24
      ELSE 0
    END
    + CASE
      WHEN image_url LIKE 'https://gallica.bnf.fr/%' THEN 22
      WHEN image_url LIKE 'https://archive.org/services/img/%' THEN 10
      ELSE 0
    END
    + CASE
      WHEN page_url LIKE 'https://gallica.bnf.fr/%' THEN 16
      WHEN page_url LIKE 'https://archive.org/%' THEN 8
      ELSE 0
    END
    + CASE
      WHEN publication_date BETWEEN '1890-01-01' AND '1970-12-31' THEN 20
      WHEN publication_date BETWEEN '1971-01-01' AND '1994-12-31' THEN 10
      ELSE 0
    END
    + CASE
      WHEN LOWER(COALESCE(title, '')) LIKE '%daily%' THEN 12
      WHEN LOWER(COALESCE(title, '')) LIKE '%tribune%' THEN 12
      WHEN LOWER(COALESCE(title, '')) LIKE '%herald%' THEN 12
      WHEN LOWER(COALESCE(title, '')) LIKE '%globe%' THEN 10
      WHEN LOWER(COALESCE(title, '')) LIKE '%times%' THEN 8
      ELSE 0
    END
    + CASE
      WHEN publication_date >= '1970-01-01' AND ${NEWSPAPERISH_PAPER_TEXT_SQL} THEN 28
      ELSE 0
    END
    + CASE
      WHEN publication_date >= '1970-01-01' AND ${EVENTFUL_PAPER_TEXT_SQL} THEN 22
      ELSE 0
    END
    - CASE
      WHEN LOWER(COALESCE(title, '')) LIKE 'ark:/%' THEN 240
      WHEN LOWER(COALESCE(title, '')) LIKE '%bulletin%' THEN 110
      WHEN LOWER(COALESCE(title, '')) LIKE '%acta%' THEN 110
      WHEN LOWER(COALESCE(title, '')) LIKE '%comptes rendus%' THEN 110
      WHEN LOWER(COALESCE(title, '')) LIKE '%revue%' THEN 95
      WHEN LOWER(COALESCE(title, '')) LIKE '%academie%' THEN 90
      WHEN LOWER(COALESCE(title, '')) LIKE '%académie%' THEN 90
      WHEN LOWER(COALESCE(title, '')) LIKE '%techniques%' THEN 88
      WHEN LOWER(COALESCE(title, '')) LIKE '%publication mensuelle%' THEN 88
      ELSE 0
    END
    - CASE
      WHEN source = 'Internet Archive' AND publication_date >= '1995-01-01' THEN 130
      ELSE 0
    END
    - CASE
      WHEN LOWER(COALESCE(title, '')) LIKE '%test%' THEN 220
      WHEN LOWER(COALESCE(summary, '')) LIKE '%test%' THEN 180
      ELSE 0
    END
    - CASE
      WHEN title GLOB 'WLS_*' THEN 180
      WHEN title GLOB '000*' THEN 95
      ELSE 0
    END
    - CASE
      WHEN LOWER(COALESCE(title, '')) LIKE '%family%' THEN 95
      WHEN LOWER(COALESCE(summary, '')) LIKE '%family%' THEN 95
      ELSE 0
    END
    - CASE
      WHEN LOWER(COALESCE(summary, '')) LIKE '%book award%' THEN 70
      WHEN LOWER(COALESCE(summary, '')) LIKE '%medical doctors%' THEN 60
      ELSE 0
    END
    - CASE
      WHEN LOWER(COALESCE(summary, '')) LIKE '%magazine%' THEN 28
      WHEN LOWER(COALESCE(summary, '')) LIKE '%revista mensual%' THEN 24
      ELSE 0
    END
    - CASE
      WHEN ${NON_NEWSPAPER_DOCUMENT_SQL} THEN 260
      ELSE 0
    END
    - CASE
      WHEN ${LATE_GALLICA_PERIODICAL_SQL} THEN 180
      ELSE 0
    END
  )
`;

const VIDEO_QUALITY_SQL = `
  (
    CASE
      WHEN source = 'AP Archive (YouTube)' THEN 125
      WHEN source = 'British Movietone (YouTube)' THEN 118
      WHEN source = 'Smithsonian Open Video' THEN 96
      WHEN source = 'Internet Archive Videos' THEN 46
      WHEN source = 'Cambridge South Asian Films' THEN 64
      WHEN source = 'British Pathe' THEN 58
      WHEN source = 'CriticalPast' THEN 56
      ELSE 0
    END
    + CASE
      WHEN LENGTH(TRIM(COALESCE(event_id, ''))) > 0 OR LENGTH(TRIM(COALESCE(event_name, ''))) > 0 THEN 40
      ELSE 0
    END
    + CASE
      WHEN ${REAL_VIDEO_THUMBNAIL_SQL} THEN 28
      WHEN LENGTH(TRIM(COALESCE(thumbnail_url, ''))) > 0 THEN 8
      ELSE 0
    END
    + CASE
      WHEN LOWER(COALESCE(title, '')) LIKE '%newsreel%' THEN 26
      WHEN ${EVENTFUL_VIDEO_TEXT_SQL} THEN 22
      ELSE 0
    END
    + CASE
      WHEN LOWER(COALESCE(description, '')) LIKE '%newsreel%' THEN 18
      WHEN LOWER(COALESCE(description, '')) LIKE '%documentary%' THEN 8
      WHEN ${getPositiveVideoCollectionSql()} THEN 16
      ELSE 0
    END
    - CASE
      WHEN source = 'Internet Archive Videos' AND NOT ${getPositiveVideoCollectionSql()} THEN 96
      ELSE 0
    END
    - CASE
      WHEN source = 'Cambridge South Asian Audio' THEN 240
      ELSE 0
    END
    - CASE
      WHEN LOWER(COALESCE(title, '')) LIKE 'interview:%' THEN 120
      ELSE 0
    END
    - CASE
      WHEN LOWER(COALESCE(title, '')) LIKE '%songs%' THEN 240
      WHEN LOWER(COALESCE(title, '')) LIKE '%playlist%' THEN 220
      WHEN LOWER(COALESCE(title, '')) LIKE '%lecture%' THEN 220
      WHEN LOWER(COALESCE(title, '')) LIKE '%seminar%' THEN 220
      WHEN LOWER(COALESCE(title, '')) LIKE '%conference%' THEN 220
      ELSE 0
    END
    - CASE
      WHEN LOWER(COALESCE(tags, '')) LIKE '%oral history%' THEN 140
      ELSE 0
    END
    - CASE
      WHEN LOWER(COALESCE(description, '')) LIKE '%playlist%' THEN 220
      WHEN LOWER(COALESCE(description, '')) LIKE '%speaker%' THEN 220
      WHEN LOWER(COALESCE(description, '')) LIKE '%lecture%' THEN 220
      WHEN LOWER(COALESCE(description, '')) LIKE '%seminar%' THEN 220
      WHEN LOWER(COALESCE(description, '')) LIKE '%conference%' THEN 220
      WHEN LOWER(COALESCE(description, '')) LIKE '%transcript available below%' THEN 260
      ELSE 0
    END
    - CASE
      WHEN ${getNegativeVideoCollectionSql()} THEN 260
      WHEN TRIM(COALESCE(title, '')) GLOB '[0-9][0-9][0-9][0-9]' THEN 260
      ELSE 0
    END
    - CASE
      WHEN LENGTH(TRIM(COALESCE(thumbnail_url, ''))) = 0 THEN 100
      ELSE 0
    END
    - CASE
      WHEN ${JUNK_VIDEO_SQL} THEN 320
      ELSE 0
    END
  )
`;

const DEFAULT_VIDEO_VISIBILITY_SQL = `
  (
    ${REAL_VIDEO_THUMBNAIL_SQL}
    AND NOT ${JUNK_VIDEO_SQL}
    AND ${VIDEO_QUALITY_SQL} >= 110
  )
`;

const MOJIBAKE_PATTERNS = [
  /Ã/g,
  /Â/g,
  /â[\u0080-\u00bf]?/g,
  /ã[\u0080-\u00bf]?/g,
  /æ[\u0080-\u00bf]?/g,
  /ç[\u0080-\u00bf]?/g,
  /Ð/g,
  /Ñ/g,
  /Ø/g,
  /Ù/g,
  /�/g,
  /[\u0080-\u009f]/g,
] as const;

const HTML_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function parseFilters(
  raw: Record<string, string | string[] | undefined> | undefined,
): ArchiveFilters {
  const q = asString(raw?.q).trim();
  const source = asString(raw?.source).trim();
  const year = asString(raw?.year).replace(/[^0-9]/g, '').slice(0, 4);
  const decade = asString(raw?.decade).replace(/[^0-9]/g, '').slice(0, 4);
  const event = asString(raw?.event).toLowerCase().replace(/[^a-z0-9-]/g, '');
  const pageValue = Number.parseInt(asString(raw?.page), 10);

  return {
    q,
    source,
    year,
    decade,
    event,
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

function slugifyEventLookup(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeEventLookup(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function appendStoredEventFilter(
  clauses: string[],
  params: unknown[],
  event: HistoricalEventDefinition | null,
): void {
  if (!event) return;

  const eventIdTerms = Array.from(
    new Set(
      [event.slug, event.title, ...event.aliases]
        .map(slugifyEventLookup)
        .filter(Boolean),
    ),
  );
  const eventNameTerms = Array.from(
    new Set(
      [event.title, ...event.aliases]
        .map(normalizeEventLookup)
        .filter(Boolean),
    ),
  );

  if (eventIdTerms.length === 0 && eventNameTerms.length === 0) {
    return;
  }

  const comparisons: string[] = [];

  if (eventIdTerms.length > 0) {
    comparisons.push(`LOWER(TRIM(COALESCE(event_id, ''))) IN (${eventIdTerms.map(() => '?').join(', ')})`);
    params.push(...eventIdTerms);
  }

  if (eventNameTerms.length > 0) {
    comparisons.push(`LOWER(TRIM(COALESCE(event_name, ''))) IN (${eventNameTerms.map(() => '?').join(', ')})`);
    params.push(...eventNameTerms);
  }

  if (comparisons.length > 0) {
    clauses.push(`(${comparisons.join(' OR ')})`);
  }
}

function applyTemporalFilters(
  filters: ArchiveFilters,
  dateColumn: string,
  clauses: string[],
  params: unknown[],
): void {
  if (filters.year) {
    clauses.push(`strftime('%Y', ${dateColumn}) = ?`);
    params.push(filters.year);
    return;
  }

  if (filters.decade) {
    const decadeStart = Number.parseInt(filters.decade, 10);
    if (Number.isFinite(decadeStart)) {
      clauses.push(`${dateColumn} >= ?`);
      clauses.push(`${dateColumn} <= ?`);
      params.push(`${decadeStart}-01-01`, `${decadeStart + 9}-12-31`);
    }
  }
}

function applySearchFilters(
  filters: ArchiveFilters,
  clauses: string[],
  params: unknown[],
  columns: string[],
): void {
  if (!filters.q) return;

  const like = `%${escapeLike(filters.q)}%`;
  clauses.push(
    `(${columns
      .map((column) => `LOWER(COALESCE(${column}, '')) LIKE LOWER(?) ESCAPE '\\'`)
      .join(' OR ')})`,
  );

  for (let index = 0; index < columns.length; index += 1) {
    params.push(like);
  }
}

function addWhereClause(where: string, clause: string): string {
  return where ? `${where} AND ${clause}` : `WHERE ${clause}`;
}

function buildFeaturedPaperWhere(
  filters: ArchiveFilters,
  selectedEvent: HistoricalEventDefinition | null,
): {
  where: string;
  params: unknown[];
} {
  const clauses: string[] = [
    "publication_date IS NOT NULL",
    "LENGTH(TRIM(COALESCE(image_url, ''))) > 0",
    "source <> 'Qatar Digital Library'",
    `${FEATURED_QUALITY_SQL} >= ${selectedEvent ? 28 : 55}`,
  ];
  const params: unknown[] = [];

  if (filters.source) {
    clauses.push('source = ?');
    params.push(filters.source);
  } else if (selectedEvent) {
    clauses.push(`(source <> 'Internet Archive' OR ${INTERNET_ARCHIVE_BASELINE_SQL})`);
  } else {
    clauses.push(`(
      source = 'Chronicling America'
      OR source = 'Library of Congress'
      OR source = 'Gallica'
      OR ${INTERNET_ARCHIVE_BASELINE_SQL}
    )`);
  }

  if (!filters.source) {
    clauses.push(PAPER_NEWSPAPER_EVIDENCE_SQL);
    clauses.push(`NOT ${NON_NEWSPAPER_DOCUMENT_SQL}`);
    clauses.push(`NOT ${LATE_GALLICA_PERIODICAL_SQL}`);
    clauses.push(`NOT ${QDL_FILE_LIKE_DOCUMENT_SQL}`);
    clauses.push(`NOT ${GALLICA_NON_NEWSPAPER_OBJECT_SQL}`);
  }

  if (!filters.decade && !selectedEvent && !filters.source) {
    clauses.push(`(
      ${EVENTFUL_PAPER_TEXT_SQL}
      OR ${NEWSPAPERISH_PAPER_TEXT_SQL}
    )`);
  }

  appendStoredEventFilter(clauses, params, selectedEvent);
  applyTemporalFilters(filters, 'publication_date', clauses, params);
  applySearchFilters(filters, clauses, params, ['title', 'summary', 'translated_title', 'translated_summary', 'source']);

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function buildTextPaperWhere(
  filters: ArchiveFilters,
  selectedEvent: HistoricalEventDefinition | null,
): {
  where: string;
  params: unknown[];
} {
  const featuredThreshold = selectedEvent ? 28 : 55;
  const clauses: string[] = [
    `(LENGTH(TRIM(COALESCE(image_url, ''))) = 0 OR ${FEATURED_QUALITY_SQL} < ${featuredThreshold})`,
    "source <> 'Qatar Digital Library'",
  ];
  const params: unknown[] = [];

  if (filters.source) {
    clauses.push('source = ?');
    params.push(filters.source);
  }

  if (!filters.source) {
    clauses.push(`NOT ${NON_NEWSPAPER_DOCUMENT_SQL}`);
    clauses.push(`NOT ${QDL_FILE_LIKE_DOCUMENT_SQL}`);
  }

  appendStoredEventFilter(clauses, params, selectedEvent);
  applyTemporalFilters(filters, 'publication_date', clauses, params);
  applySearchFilters(filters, clauses, params, ['title', 'summary', 'translated_title', 'translated_summary', 'source']);

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function buildImageWhere(
  filters: ArchiveFilters,
  selectedEvent: HistoricalEventDefinition | null,
): {
  where: string;
  params: unknown[];
} {
  const clauses: string[] = [
    "image_date IS NOT NULL",
    "(LENGTH(TRIM(COALESCE(image_url, ''))) > 0 OR LENGTH(TRIM(COALESCE(preview_url, ''))) > 0)",
    "source <> 'Qatar Digital Library'",
  ];
  const params: unknown[] = [];

  if (filters.source) {
    clauses.push('source = ?');
    params.push(filters.source);
    } else {
      clauses.push(
        "(source = 'Smithsonian Open Images' OR source = 'Chronicling America' OR source = 'Endangered Archives Programme' OR source = 'Cambridge South Asian Films' OR source = 'Smithsonian' OR source = 'Europeana')",
      );
    }

  appendStoredEventFilter(clauses, params, selectedEvent);
  clauses.push(`${IMAGE_QUALITY_SQL} >= 40`);
  clauses.push(`NOT ${QDL_FILE_LIKE_IMAGE_SQL}`);

  if (!filters.decade && !selectedEvent && !filters.source) {
    clauses.push(`(
      LENGTH(TRIM(COALESCE(event_id, ''))) > 0
      OR LENGTH(TRIM(COALESCE(event_name, ''))) > 0
      OR ${EVENTFUL_IMAGE_TEXT_SQL}
    )`);
  }

  applyTemporalFilters(filters, 'image_date', clauses, params);
  applySearchFilters(filters, clauses, params, ['title', 'description', 'translated_title', 'translated_description', 'source', 'rights']);

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function buildEventImageWhere(
  filters: ArchiveFilters,
  selectedEvent: HistoricalEventDefinition | null,
): {
  where: string;
  params: unknown[];
} {
  const clauses: string[] = [
    "(LENGTH(TRIM(COALESCE(image_url, ''))) > 0 OR LENGTH(TRIM(COALESCE(preview_url, ''))) > 0)",
  ];
  const params: unknown[] = [];

  if (filters.source) {
    clauses.push('source = ?');
    params.push(filters.source);
  }

  appendStoredEventFilter(clauses, params, selectedEvent);
  applyTemporalFilters(filters, 'image_date', clauses, params);
  applySearchFilters(filters, clauses, params, ['title', 'description', 'translated_title', 'translated_description', 'source', 'rights']);

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function buildVideoWhere(
  filters: ArchiveFilters,
  selectedEvent: HistoricalEventDefinition | null,
): {
  where: string;
  params: unknown[];
} {
  const clauses: string[] = [
    "video_date IS NOT NULL",
    "video_date < '2010-01-01'",
    DEFAULT_VIDEO_VISIBILITY_SQL,
  ];
  const params: unknown[] = [];

  if (filters.source) {
    clauses.push('source = ?');
    params.push(filters.source);
  } else {
    clauses.push(`(
      source = 'AP Archive (YouTube)'
      OR source = 'British Movietone (YouTube)'
      OR source = 'Internet Archive Videos'
      OR source = 'Cambridge South Asian Films'
      OR source = 'British Pathe'
      OR source = 'CriticalPast'
    )`);
  }

  clauses.push(`NOT ${JUNK_VIDEO_SQL}`);
  appendStoredEventFilter(clauses, params, selectedEvent);

  if (!filters.decade && !selectedEvent && !filters.source) {
    clauses.push(`(
      LENGTH(TRIM(COALESCE(event_id, ''))) > 0
      OR LENGTH(TRIM(COALESCE(event_name, ''))) > 0
      OR ${STRONG_EVENTFUL_VIDEO_SQL}
    )`);
  }

  applyTemporalFilters(filters, 'video_date', clauses, params);
  applySearchFilters(filters, clauses, params, ['title', 'description', 'translated_title', 'translated_description', 'tags', 'source']);

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

export function __debugBuildWhereClauses(rawFilters: Partial<ArchiveFilters>) {
  const filters: ArchiveFilters = {
    q: rawFilters.q ?? '',
    source: rawFilters.source ?? '',
    year: rawFilters.year ?? '',
    decade: rawFilters.decade ?? '',
    event: rawFilters.event ?? '',
    page: rawFilters.page ?? 1,
  };

  return {
    featured: buildFeaturedPaperWhere(filters, null),
    text: buildTextPaperWhere(filters, null),
    images: buildImageWhere(filters, null),
    videos: buildVideoWhere(filters, null),
  };
}

function withDerivedPaperEvent(record: NewspaperCardRecord): NewspaperCardRecord {
  const resolvedById = resolveHistoricalEvent({
    slug: record.event_id,
    name: record.event_name,
    date: record.publication_date,
    allowHeuristic: false,
  });
  if (resolvedById) {
    return {
      ...record,
      event_name: resolvedById.title,
      event_slug: resolvedById.slug,
    };
  }

  if (record.event_slug || record.event_name) {
    const matched = resolveHistoricalEvent({
      slug: record.event_slug,
      name: record.event_name,
      date: record.publication_date,
      allowHeuristic: false,
    });

    if (matched) {
      return {
        ...record,
        event_name: matched.title,
        event_slug: matched.slug,
      };
    }

    return record;
  }

  return record;
}

function withDerivedImageEvent(record: ArchiveImageRecord): ArchiveImageRecord {
  const resolvedById = resolveHistoricalEvent({
    slug: record.event_id,
    name: record.event_name,
    date: record.image_date,
    allowHeuristic: false,
  });
  if (resolvedById) {
    return {
      ...record,
      event_name: resolvedById.title,
      event_slug: resolvedById.slug,
    };
  }

  if (record.event_slug || record.event_name) {
    const matched = resolveHistoricalEvent({
      slug: record.event_slug,
      name: record.event_name,
      date: record.image_date,
      allowHeuristic: false,
    });

    if (matched) {
      return {
        ...record,
        event_name: matched.title,
        event_slug: matched.slug,
      };
    }

    return record;
  }

  return record;
}

const NEWSPAPER_IMAGE_SOURCE_NAMES = [
  'chronicling america',
] as const;

const EXCLUDED_NEWSPAPER_IMAGE_SOURCE_NAMES = [
  'qatar digital library',
] as const;

const NEWSPAPER_IMAGE_TEXT_PATTERNS = [
  /\bnewspaper\b/i,
  /\bfront page\b/i,
  /\bheadline/i,
  /\bedition\b/i,
  /\bissue\b/i,
  /\bdaily\b/i,
  /\bweekly\b/i,
  /\bgazette\b/i,
  /\bgaceta\b/i,
  /\bcourier\b/i,
  /\bherald\b/i,
  /\btribune\b/i,
  /\btimes\b/i,
  /\bjournal\b/i,
  /\bpress\b/i,
  /\bchronicle\b/i,
  /\bsentinel\b/i,
  /\bpost\b/i,
  /\bnews\b/i,
  /\bstar\b/i,
  /\bcorriere\b/i,
] as const;

function isNewspaperImageRecord(record: ArchiveImageRecord): boolean {
  const source = String(record.source ?? '').toLowerCase();
  if (EXCLUDED_NEWSPAPER_IMAGE_SOURCE_NAMES.some((name) => source.includes(name))) {
    return false;
  }

  if (NEWSPAPER_IMAGE_SOURCE_NAMES.some((name) => source.includes(name))) {
    return true;
  }

  const text = [
    record.title,
    record.description,
    record.translated_title,
    record.translated_description,
    record.page_url,
    record.image_url,
    record.preview_url,
    record.metadata_json,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return NEWSPAPER_IMAGE_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function imageRecordToNewspaperRecord(record: ArchiveImageRecord): NewspaperCardRecord {
  const links = getImageLinks(record);

  return {
    id: record.id,
    source: record.source,
    title: record.title,
    country: record.country,
    region: record.region,
    publication_date: record.image_date,
    language: record.language,
    image_url: links.imageUrl ?? links.previewUrl ?? record.image_url ?? record.preview_url,
    page_url: links.pageUrl ?? record.page_url,
    summary: record.description,
    event_id: record.event_id ?? null,
    event_name: record.event_name ?? null,
    archive_id: record.archive_id,
    metadata_json: record.metadata_json,
    translated_title: record.translated_title ?? null,
    translated_summary: record.translated_description ?? null,
    translation_language: record.translation_language ?? null,
    translation_model: record.translation_model ?? null,
    media_kind: 'image',
    event_slug: record.event_slug,
    quality_score: record.quality_score,
  };
}

function dedupePaperRecords(records: NewspaperCardRecord[]): NewspaperCardRecord[] {
  const seen = new Set<string>();
  const result: NewspaperCardRecord[] = [];

  for (const record of records) {
    const key = record.archive_id || `${record.source}:${record.title}:${record.publication_date ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(record);
  }

  return result;
}

function sortPaperRecordsByDate(records: NewspaperCardRecord[]): NewspaperCardRecord[] {
  return [...records].sort((left, right) => {
    const rightTime = Date.parse(right.publication_date ?? '') || 0;
    const leftTime = Date.parse(left.publication_date ?? '') || 0;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return right.id - left.id;
  });
}

function withDerivedVideoEvent(record: VideoCardRecord): VideoCardRecord {
  const resolvedById = resolveHistoricalEvent({
    slug: record.event_id,
    name: record.event_name,
    date: record.video_date,
    allowHeuristic: false,
  });
  if (resolvedById) {
    return {
      ...record,
      event_name: resolvedById.title,
      event_slug: resolvedById.slug,
    };
  }

  if (record.event_slug || record.event_name) {
    const matched = resolveHistoricalEvent({
      slug: record.event_slug,
      name: record.event_name,
      date: record.video_date,
      allowHeuristic: false,
    });

    if (matched) {
      return {
        ...record,
        event_name: matched.title,
        event_slug: matched.slug,
      };
    }

    return record;
  }

  return record;
}

function filterBySelectedEvent<T extends { event_slug?: string | null }>(
  records: T[],
  eventSlug: string,
): T[] {
  return records.filter((record) => record.event_slug === eventSlug);
}

function roundRobinByKey<T>(
  records: T[],
  keyFor: (record: T, index: number) => string | null | undefined,
): T[] {
  const groups = new Map<string, T[]>();
  const order: string[] = [];

  records.forEach((record, index) => {
    const rawKey = keyFor(record, index)?.trim();
    const key = rawKey && rawKey.length > 0 ? rawKey : `__ungrouped-${index}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(record);
      return;
    }

    groups.set(key, [record]);
    order.push(key);
  });

  const result: T[] = [];
  let remaining = true;

  while (remaining) {
    remaining = false;
    for (const key of order) {
      const bucket = groups.get(key);
      const next = bucket?.shift();
      if (!next) continue;
      result.push(next);
      remaining = true;
    }
  }

  return result;
}

function spreadHomepageRecords<T>(
  records: T[],
  keyFns: Array<(record: T, index: number) => string | null | undefined>,
): T[] {
  return keyFns.reduce(
    (current, keyFn) => roundRobinByKey(current, keyFn),
    records,
  );
}

function mapEventAggregates(rows: EventAggregateRow[] | undefined): Map<string, EventAggregateRow> {
  return new Map(
    (rows ?? [])
      .map((row) => ({
        ...row,
        slug: String(row.slug ?? '').trim(),
        count: Number(row.count ?? 0),
        lead_archive_id: row.lead_archive_id ? String(row.lead_archive_id) : null,
      }))
      .filter((row) => row.slug.length > 0 && row.count > 0)
      .map((row) => [row.slug, row] as const),
  );
}

function buildHistoricalEventCardsFromAggregates(
  paperMap: Map<string, EventAggregateRow>,
  imageMap: Map<string, EventAggregateRow>,
  videoMap: Map<string, EventAggregateRow>,
): HistoricalEventCard[] {
  const cards: HistoricalEventCard[] = [];

  for (const event of MAJOR_HISTORICAL_EVENTS) {
    const paperAggregate = paperMap.get(event.slug);
    const imageAggregate = imageMap.get(event.slug);
    const videoAggregate = videoMap.get(event.slug);
    const paperCount = paperAggregate?.count ?? 0;
    const imageCount = imageAggregate?.count ?? 0;
    const videoCount = videoAggregate?.count ?? 0;
    const visualCount = paperCount + imageCount;
    const totalCount = visualCount + videoCount;

    // Keep the homepage event strip visually grounded: if an event has no
    // paper scans or archive images, it should not surface as a primary card.
    if (visualCount === 0 || totalCount === 0) {
      continue;
    }

    const leadMediaKind = paperAggregate?.lead_archive_id
      ? 'newspaper'
      : imageAggregate?.lead_archive_id
        ? 'image'
        : videoAggregate?.lead_archive_id
          ? 'video'
          : null;
    const leadArchiveId = paperAggregate?.lead_archive_id
      ?? imageAggregate?.lead_archive_id
      ?? videoAggregate?.lead_archive_id
      ?? null;

    cards.push({
      slug: event.slug,
      title: event.title,
      periodLabel: event.periodLabel,
      summary: event.summary,
      paperCount,
      imageCount,
      videoCount,
      totalCount,
      leadMediaKind,
      leadArchiveId,
    });
  }

  return cards;
}

export async function getArchiveHomeData(filters: ArchiveFilters): Promise<ArchiveHomeData> {
  const bindings = getBindings();
  const db = bindings.DB;
  const selectedEvent = getHistoricalEventBySlug(filters.event);
  const featuredWhere = buildFeaturedPaperWhere(filters, selectedEvent);
  const imageWhere = buildImageWhere(filters, selectedEvent);
  const hasScopedFilters = Boolean(
    selectedEvent
    || filters.decade
    || filters.year
    || filters.source
    || filters.q,
  );
  const lateDecadeScoped = Boolean(
    filters.decade && Number.parseInt(filters.decade, 10) >= 1970 && !selectedEvent,
  );
  const featuredCandidateLimit = hasScopedFilters
    ? (lateDecadeScoped ? 24 : FEATURED_CANDIDATE_LIMIT)
    : FEATURED_CANDIDATE_LIMIT;
  const imageCandidateLimit = hasScopedFilters
    ? (lateDecadeScoped ? 32 : IMAGE_CANDIDATE_LIMIT)
    : IMAGE_CANDIDATE_LIMIT;
  const useLightweightScopedQueries = hasScopedFilters;

  let featuredCandidates: NewspaperCardRecord[] = [];
  let imageCandidates: ArchiveImageRecord[] = [];

  if (useLightweightScopedQueries) {
    const [
      fallbackFeaturedRows,
      fallbackImageRows,
    ] = await Promise.all([
      db.prepare(
        `SELECT id, source, title, country, region, publication_date, language, image_url, page_url,
                summary, event_id, event_name, archive_id, metadata_json,
                translated_title, translated_summary, translation_language, translation_model
         FROM raw_newspapers
         ${featuredWhere.where}
         ORDER BY publication_date DESC, id DESC
         LIMIT ?`,
      ).bind(...featuredWhere.params, Math.max(FEATURED_LIMIT, featuredCandidateLimit)).all<NewspaperCardRecord>(),
      db.prepare(
        `SELECT id, source, title, description, country, region, image_date, language,
                preview_url, image_url, page_url, rights, archive_id, event_id, event_name,
                translated_title, translated_description, translation_language, translation_model, metadata_json
         FROM archive_images
         ${imageWhere.where}
         ORDER BY image_date DESC, id DESC
         LIMIT ?`,
      ).bind(...imageWhere.params, Math.max(IMAGE_LIMIT, imageCandidateLimit)).all<ArchiveImageRecord>(),
    ]);

    featuredCandidates = (fallbackFeaturedRows.results ?? [])
      .map(withDerivedPaperEvent);
    imageCandidates = (fallbackImageRows.results ?? [])
      .map(withDerivedImageEvent);
  } else {
    try {
      const [
        featuredCandidateRows,
        imageCandidateRows,
      ] = await Promise.all([
        db.prepare(
          `SELECT id, source, title, country, region, publication_date, language, image_url, page_url,
                  summary, event_id, event_name, archive_id, metadata_json,
                  translated_title, translated_summary, translation_language, translation_model,
                  ${FEATURED_QUALITY_SQL} AS quality_score
           FROM raw_newspapers
           ${featuredWhere.where}
           ORDER BY ${STORED_EVENT_PRIORITY_SQL} DESC, quality_score DESC, publication_date DESC, ${FEATURED_SOURCE_ORDER_SQL}, id DESC
           LIMIT ?`,
        ).bind(...featuredWhere.params, featuredCandidateLimit).all<NewspaperCardRecord>(),
        db.prepare(
          `SELECT id, source, title, description, country, region, image_date, language,
                  preview_url, image_url, page_url, rights, archive_id, event_id, event_name,
                  translated_title, translated_description, translation_language, translation_model, metadata_json,
                  ${IMAGE_QUALITY_SQL} AS quality_score
           FROM archive_images
            ${imageWhere.where}
           ORDER BY ${STORED_EVENT_PRIORITY_SQL} DESC, quality_score DESC, image_date DESC, ${IMAGE_SOURCE_ORDER_SQL}, id DESC
           LIMIT ?`,
        ).bind(...imageWhere.params, imageCandidateLimit).all<ArchiveImageRecord>(),
      ]);

      featuredCandidates = (featuredCandidateRows.results ?? [])
        .map(withDerivedPaperEvent);
      imageCandidates = (imageCandidateRows.results ?? [])
        .map(withDerivedImageEvent);
    } catch (error) {
      console.error('Paperstack ranked query failed, falling back to lightweight queries.', error);

      const [
        fallbackFeaturedRows,
        fallbackImageRows,
      ] = await Promise.all([
        db.prepare(
          `SELECT id, source, title, country, region, publication_date, language, image_url, page_url,
                  summary, event_id, event_name, archive_id, metadata_json,
                  translated_title, translated_summary, translation_language, translation_model
           FROM raw_newspapers
           ${featuredWhere.where}
           ORDER BY publication_date DESC, id DESC
           LIMIT ?`,
        ).bind(...featuredWhere.params, FEATURED_LIMIT * 2).all<NewspaperCardRecord>(),
        db.prepare(
          `SELECT id, source, title, description, country, region, image_date, language,
                  preview_url, image_url, page_url, rights, archive_id, event_id, event_name,
                  translated_title, translated_description, translation_language, translation_model, metadata_json
           FROM archive_images
           ${imageWhere.where}
           ORDER BY image_date DESC, id DESC
           LIMIT ?`,
        ).bind(...imageWhere.params, IMAGE_LIMIT * 2).all<ArchiveImageRecord>(),
      ]);

      featuredCandidates = (fallbackFeaturedRows.results ?? [])
        .map(withDerivedPaperEvent);
      imageCandidates = (fallbackImageRows.results ?? [])
        .map(withDerivedImageEvent);
    }
  }
  const majorEvents: HistoricalEventCard[] = [];
  const newspaperImageCandidates = imageCandidates
    .filter(isNewspaperImageRecord)
    .map(imageRecordToNewspaperRecord)
    .map(withDerivedPaperEvent);

  const scopedFeatured = hasScopedFilters
    ? sortPaperRecordsByDate(dedupePaperRecords([...featuredCandidates, ...newspaperImageCandidates]))
    : dedupePaperRecords([...featuredCandidates, ...newspaperImageCandidates]);

  const orderedFeatured = hasScopedFilters
    ? scopedFeatured
    : selectedEvent
    ? scopedFeatured
    : spreadHomepageRecords(scopedFeatured, [
        (record) => record.event_slug,
        (record) => record.source,
      ]);

  const featuredTotal = orderedFeatured.length;
  const offset = (filters.page - 1) * FEATURED_LIMIT;
  const featuredPageRows = orderedFeatured.slice(offset, offset + FEATURED_LIMIT);

  const imageBackedPaperCount = orderedFeatured.length;
  const scopedSummary: ArchiveSummary = {
    totalPapers: imageBackedPaperCount,
    imageBackedPapers: imageBackedPaperCount,
    textOnlyPapers: 0,
    totalImages: 0,
    totalVideos: 0,
  };

  return {
    filters,
    summary: scopedSummary,
    sources: [],
    selectedEvent,
    majorEvents,
    featured: {
      data: featuredPageRows,
      total: featuredTotal,
      page: filters.page,
      pages: Math.max(Math.ceil(featuredTotal / FEATURED_LIMIT), 1),
      limit: FEATURED_LIMIT,
    },
    images: [],
    textOnly: [],
    videos: [],
  };
}

function parseJson(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string): string {
  const named = value.replace(
    /&(amp|quot|apos|lt|gt|nbsp|#39);/gi,
    (entity) => HTML_ENTITY_MAP[entity.toLowerCase()] ?? entity,
  );

  return named
    .replace(/&#(\d+);/g, (match, decimal) => {
      const codePoint = Number.parseInt(decimal, 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    })
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    });
}

function mojibakeScore(value: string): number {
  return MOJIBAKE_PATTERNS.reduce((score, pattern) => {
    const matches = value.match(pattern);
    return score + (matches?.length ?? 0);
  }, 0);
}

function tryLatin1Repair(value: string): string {
  try {
    return Buffer.from(value, 'latin1').toString('utf8');
  } catch {
    return value;
  }
}

function cleanWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = repairText(value).trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

function readPath(input: unknown, path: string[]): unknown {
  let current = input;

  for (const key of path) {
    if (current === null || current === undefined) return null;

    if (Array.isArray(current)) {
      const index = Number.parseInt(key, 10);
      if (!Number.isFinite(index)) return null;
      current = current[index];
      continue;
    }

    if (typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

export function repairText(value: string | null | undefined): string {
  let best = cleanWhitespace(decodeHtmlEntities(String(value ?? '')));
  if (!best) return '';

  let bestScore = mojibakeScore(best);

  for (let index = 0; index < 3; index += 1) {
    const candidate = cleanWhitespace(decodeHtmlEntities(tryLatin1Repair(best)));
    const candidateScore = mojibakeScore(candidate);

    if (
      candidate
      && candidate !== best
      && candidateScore < bestScore
      && !candidate.includes('\u0000')
      && !candidate.includes('\ufffd')
    ) {
      best = candidate;
      bestScore = candidateScore;
      continue;
    }

    break;
  }

  return best;
}

export function formatArchiveDate(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return 'Unknown date';

  const plainYearStart = text.match(/^(\d{4})-01-01(?:[T ].*)?$/i);
  if (plainYearStart?.[1]) {
    return plainYearStart[1];
  }

  const yearOnlyIso = text.match(/^(\d{4})-01-01T00:00:00(?:\.000)?Z$/i);
  if (yearOnlyIso?.[1]) {
    return yearOnlyIso[1];
  }

  const monthOnlyIso = text.match(/^(\d{4})-(\d{2})-01T00:00:00(?:\.000)?Z$/i);
  if (monthOnlyIso?.[1] && monthOnlyIso[2]) {
    const parsedMonth = new Date(`${monthOnlyIso[1]}-${monthOnlyIso[2]}-01T00:00:00Z`);
    if (!Number.isNaN(parsedMonth.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(parsedMonth);
    }
  }

  const plainYear = text.match(/^(\d{4})$/);
  if (plainYear?.[1]) {
    return plainYear[1];
  }

  const plainYearMonth = text.match(/^(\d{4})-(\d{2})$/);
  if (plainYearMonth?.[1] && plainYearMonth[2]) {
    const parsedMonth = new Date(`${plainYearMonth[1]}-${plainYearMonth[2]}-01T00:00:00Z`);
    if (!Number.isNaN(parsedMonth.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(parsedMonth);
    }
  }

  const parsed = new Date(`${text.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return repairText(text);

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export function formatDuration(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return 'Unknown length';
  const total = Math.max(0, Math.trunc(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function getPaperLinks(record: NewspaperCardRecord): {
  pageUrl: string | null;
  imageUrl: string | null;
} {
  const metadata = parseJson(record.metadata_json);

  const pageUrl =
    normalizeHttpUrl(record.page_url)
    ?? normalizeHttpUrl(readPath(metadata, ['content', 'descriptiveNonRepeating', 'record_link']))
    ?? normalizeHttpUrl(readPath(metadata, ['descriptiveNonRepeating', 'record_link']))
    ?? normalizeHttpUrl(readPath(metadata, ['recordData', 'dc', 'identifier']))
    ?? normalizeHttpUrl(readPath(metadata, ['extraRecordData', 'link']))
    ?? null;

  const imageUrl =
    normalizeHttpUrl(record.image_url)
    ?? normalizeHttpUrl(readPath(metadata, ['extraRecordData', 'thumbnail']))
    ?? normalizeHttpUrl(readPath(metadata, ['content', 'descriptiveNonRepeating', 'online_media', 'media', '0', 'content']))
    ?? null;

  return { pageUrl, imageUrl };
}

export function getPaperHighResUrl(record: NewspaperCardRecord): string | null {
  const metadata = parseJson(record.metadata_json);
  return (
    normalizeHttpUrl(readPath(metadata, ['extraRecordData', 'highres']))
    ?? normalizeHttpUrl(readPath(metadata, ['extraRecordData', 'medres']))
    ?? null
  );
}

export function getPaperDisplayTitle(record: NewspaperCardRecord): string {
  return cleanDisplayDescription(record.translated_title || record.title);
}

export function getPaperDisplaySummary(record: NewspaperCardRecord): string {
  return cleanDisplayDescription(record.translated_summary || record.summary);
}

export function getImageDisplayTitle(record: ArchiveImageRecord): string {
  return cleanDisplayDescription(record.translated_title || record.title);
}

export function getImageDisplayDescription(record: ArchiveImageRecord): string {
  return cleanDisplayDescription(record.translated_description || record.description);
}

export function getVideoDisplayTitle(record: VideoCardRecord): string {
  return cleanDisplayDescription(record.translated_title || record.title);
}

export function getVideoDisplayDescription(record: VideoCardRecord): string {
  return cleanDisplayDescription(record.translated_description || record.description);
}

const DISPLAY_NOISE_PATTERNS = [
  /library of congress public access;?\s*verify item-level rights and access notes\.?/i,
  /the copyright status is unknown\.?/i,
  /please contact\s+\[?email protected\]?\s+with any information you have regarding this item\.?/i,
  /verify item-level rights and access notes\.?/i,
] as const;

function cleanDisplayDescription(value: string | null | undefined): string {
  let text = repairText(value);

  for (const pattern of DISPLAY_NOISE_PATTERNS) {
    text = text.replace(pattern, ' ');
  }

  text = text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

  return text;
}

export function getImageLinks(record: ArchiveImageRecord): {
  pageUrl: string | null;
  previewUrl: string | null;
  imageUrl: string | null;
} {
  const metadata = parseJson(record.metadata_json);

  return {
    pageUrl:
      normalizeHttpUrl(record.page_url)
      ?? normalizeHttpUrl(readPath(metadata, ['content', 'descriptiveNonRepeating', 'record_link']))
      ?? normalizeHttpUrl(readPath(metadata, ['descriptiveNonRepeating', 'record_link']))
      ?? null,
    previewUrl:
      normalizeHttpUrl(record.preview_url)
      ?? normalizeHttpUrl(readPath(metadata, ['extraRecordData', 'thumbnail']))
      ?? null,
    imageUrl:
      normalizeHttpUrl(record.image_url)
      ?? normalizeHttpUrl(readPath(metadata, ['extraRecordData', 'highres']))
      ?? normalizeHttpUrl(readPath(metadata, ['extraRecordData', 'medres']))
      ?? normalizeHttpUrl(readPath(metadata, ['content', 'descriptiveNonRepeating', 'online_media', 'media', '0', 'content']))
      ?? null,
  };
}

export function getVideoPageUrl(record: VideoCardRecord): string | null {
  if (record.video_url && /^https?:\/\//i.test(record.video_url)) {
    return record.video_url;
  }

  const metadata = parseJson(record.metadata_json);
  return normalizeHttpUrl(readPath(metadata, ['url'])) ?? null;
}

export function buildHref(
  filters: ArchiveFilters,
  overrides: Partial<ArchiveFilters>,
): string {
  const next: ArchiveFilters = {
    ...filters,
    ...overrides,
  };

  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.source) params.set('source', next.source);
  if (next.year) params.set('year', next.year);
  if (next.decade) params.set('decade', next.decade);
  if (next.event) params.set('event', next.event);
  if (next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return query ? `/?${query}` : '/';
}
