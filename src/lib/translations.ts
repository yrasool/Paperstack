import type { NewspaperCardRecord } from './archive';
import { GEMMA_TRANSLATION_MODEL, translateToEnglishWithGemma } from './aiEnrichment';

const TRANSLATION_LANGUAGE = 'en';
const MAX_TRANSLATION_CHARS = 1200;

interface TranslationEnrichmentOptions {
  allowLiveTranslate?: boolean;
}

function clampTranslationText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TRANSLATION_CHARS);
}

function hasNonLatinSignal(value: string | null | undefined): boolean {
  return /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(
    String(value ?? ''),
  );
}

function needsTranslation(record: NewspaperCardRecord): boolean {
  const language = String(record.language ?? '').trim().toLowerCase();
  const source = String(record.source ?? '').trim().toLowerCase();

  if (!language && !record.title && !record.summary) return false;
  if (language === 'en' || language === 'eng' || language === 'english') return false;
  if (source === 'japan ndl') return true;
  if (language && language !== 'en' && language !== 'eng' && language !== 'english') return true;
  return hasNonLatinSignal(record.title) || hasNonLatinSignal(record.summary);
}

async function translateToEnglish(ai: Ai, value: string, languageHint?: string | null): Promise<string | null> {
  const text = clampTranslationText(value);
  if (!text) return null;

  try {
    const translated = await translateToEnglishWithGemma(ai, text, languageHint);
    return translated?.trim() ? translated.trim() : null;
  } catch {
    return null;
  }
}

export async function enrichTranslatedPapers(
  db: D1Database,
  ai: Ai | undefined,
  records: NewspaperCardRecord[],
  options: TranslationEnrichmentOptions = {},
): Promise<NewspaperCardRecord[]> {
  if (!ai || records.length === 0 || options.allowLiveTranslate === false) {
    return records;
  }

  const cache = new Map<number, NewspaperCardRecord>();

  await Promise.all(
    records.map(async (record) => {
      if (!needsTranslation(record)) {
        cache.set(record.id, record);
        return;
      }

      const languageHint = record.language ?? null;
      const translatedTitle = record.translated_title
        ?? await translateToEnglish(ai, record.title, languageHint);
      const translatedSummary = record.translated_summary
        ?? await translateToEnglish(ai, record.summary ?? '', languageHint);

      if (translatedTitle || translatedSummary) {
        await db
          .prepare(
            `UPDATE raw_newspapers
             SET translated_title = COALESCE(?, translated_title),
                 translated_summary = COALESCE(?, translated_summary),
                 translation_language = ?,
                 translation_model = ?,
                 translated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
          )
          .bind(
            translatedTitle ?? null,
            translatedSummary ?? null,
            TRANSLATION_LANGUAGE,
            GEMMA_TRANSLATION_MODEL,
            record.id,
          )
          .run();
      }

      cache.set(record.id, {
        ...record,
        translated_title: translatedTitle ?? record.translated_title ?? null,
        translated_summary: translatedSummary ?? record.translated_summary ?? null,
        translation_language: (translatedTitle || translatedSummary)
          ? TRANSLATION_LANGUAGE
          : record.translation_language ?? null,
        translation_model: (translatedTitle || translatedSummary)
          ? GEMMA_TRANSLATION_MODEL
          : record.translation_model ?? null,
      });
    }),
  );

  return records.map((record) => cache.get(record.id) ?? record);
}
