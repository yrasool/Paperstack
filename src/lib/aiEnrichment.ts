import {
  MAJOR_HISTORICAL_EVENTS,
  matchHistoricalEvent,
  type HistoricalEventCandidateInput,
  type HistoricalEventDefinition,
} from './historicalEvents';

export const GEMMA_TRANSLATION_MODEL = '@cf/google/gemma-4-26b-a4b-it';
export const GEMMA_EMBEDDING_MODEL = '@cf/google/embeddinggemma-300m';
const GEMMA_TRANSLATION_MODEL_ID = GEMMA_TRANSLATION_MODEL as unknown as keyof AiModels;
const GEMMA_EMBEDDING_MODEL_ID = GEMMA_EMBEDDING_MODEL as unknown as keyof AiModels;
const MAX_AI_TEXT_CHARS = 1600;
const MAX_EMBEDDING_CANDIDATES = 6;
const MIN_EMBEDDING_SIMILARITY = 0.52;

export interface RankedHistoricalEvent {
  event: HistoricalEventDefinition;
  score: number;
}

function clampText(value: string | null | undefined, maxChars = MAX_AI_TEXT_CHARS): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

function extractModelText(response: unknown): string | null {
  if (typeof response === 'string') {
    const trimmed = response.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!response || typeof response !== 'object') return null;
  const record = response as Record<string, unknown>;

  const direct = [
    'response',
    'text',
    'output_text',
    'generated_text',
    'answer',
    'result',
  ];

  for (const key of direct) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const responseField = record.response;
  if (Array.isArray(responseField)) {
    const joined = responseField
      .map((item) => (typeof item === 'string' ? item : ''))
      .filter(Boolean)
      .join(' ')
      .trim();
    return joined || null;
  }

  const resultField = record.result;
  if (resultField && typeof resultField === 'object') {
    return extractModelText(resultField);
  }

  return null;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;

    try {
      return JSON.parse(value.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}

function buildCandidateText(candidate: HistoricalEventCandidateInput): string {
  return clampText(
    [
      candidate.eventName,
      candidate.title,
      candidate.summary,
      candidate.description,
      candidate.tags,
      candidate.country,
      candidate.region,
      candidate.date,
    ]
      .filter(Boolean)
      .join(' | '),
  );
}

function buildEventText(event: HistoricalEventDefinition): string {
  return clampText(
    [
      event.title,
      event.periodLabel,
      event.summary,
      event.aliases.join(', '),
      event.keywords.join(', '),
      (event.regions ?? []).join(', '),
      event.startDate,
      event.endDate,
    ].join(' | '),
  );
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) return -1;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }

  if (leftNorm === 0 || rightNorm === 0) return -1;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function isWorkersAIQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('4006') || message.includes('daily free allocation') || message.includes('neurons');
}

async function embedTexts(ai: Ai, text: string[]): Promise<number[][]> {
  let response: {
    data?: number[][];
  } | null = null;

  try {
    response = await ai.run(GEMMA_EMBEDDING_MODEL_ID, { text }) as {
      data?: number[][];
    } | null;
  } catch (error) {
    if (isWorkersAIQuotaError(error)) {
      return [];
    }

    throw error;
  }

  return Array.isArray(response?.data) ? response.data : [];
}

export async function translateToEnglishWithGemma(
  ai: Ai,
  value: string | null | undefined,
  languageHint?: string | null,
): Promise<string | null> {
  const text = clampText(value);
  if (!text) return null;

  let response: unknown;

  try {
    response = await ai.run(GEMMA_TRANSLATION_MODEL_ID, {
      messages: [
        {
          role: 'system',
          content:
            'You clean OCR noise and translate archival text into concise natural English. Return only the cleaned English translation, with no commentary.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'translate_to_english',
            language_hint: languageHint ?? null,
            text,
          }),
        },
      ],
      max_tokens: 300,
    }) as unknown;
  } catch (error) {
    if (isWorkersAIQuotaError(error)) {
      return null;
    }

    throw error;
  }

  return extractModelText(response);
}

export async function rankHistoricalEventsByEmbedding(
  ai: Ai,
  candidate: HistoricalEventCandidateInput,
): Promise<RankedHistoricalEvent[]> {
  const candidateText = buildCandidateText(candidate);
  if (!candidateText) return [];

  const eventTexts = MAJOR_HISTORICAL_EVENTS.map(buildEventText);
  const embeddings = await embedTexts(ai, [candidateText, ...eventTexts]);
  if (embeddings.length !== eventTexts.length + 1) return [];

  const [candidateEmbedding, ...eventEmbeddings] = embeddings;
  const ranked = MAJOR_HISTORICAL_EVENTS.map((event, index) => ({
    event,
    score: cosineSimilarity(candidateEmbedding ?? [], eventEmbeddings[index] ?? []),
  }))
    .filter((item) => Number.isFinite(item.score))
    .sort((left, right) => right.score - left.score);

  return ranked.slice(0, MAX_EMBEDDING_CANDIDATES);
}

export async function inferHistoricalEventWithAI(
  ai: Ai,
  candidate: HistoricalEventCandidateInput,
): Promise<HistoricalEventDefinition | null> {
  const heuristic = matchHistoricalEvent(candidate);
  if (heuristic && heuristic.score >= 44) {
    return heuristic.event;
  }

  const ranked = await rankHistoricalEventsByEmbedding(ai, candidate);
  if (ranked.length === 0 || ranked[0].score < MIN_EMBEDDING_SIMILARITY) {
    return null;
  }

  let response: unknown;

  try {
    response = await ai.run(GEMMA_TRANSLATION_MODEL_ID, {
      messages: [
        {
          role: 'system',
          content:
            'You assign archive records to one historical event from a provided shortlist. Respond with JSON only in the form {"slug":"..."} or {"slug":"none"}.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            candidate: {
              title: clampText(candidate.title),
              summary: clampText(candidate.summary),
              description: clampText(candidate.description),
              tags: clampText(candidate.tags, 400),
              country: candidate.country ?? null,
              region: candidate.region ?? null,
              date: candidate.date ?? null,
            },
            shortlist: ranked.map((item) => ({
              slug: item.event.slug,
              title: item.event.title,
              periodLabel: item.event.periodLabel,
              summary: item.event.summary,
              aliases: item.event.aliases,
              keywords: item.event.keywords,
              regions: item.event.regions ?? [],
              similarity: Number(item.score.toFixed(4)),
            })),
          }),
        },
      ],
      max_tokens: 180,
    }) as unknown;
  } catch (error) {
    if (isWorkersAIQuotaError(error)) {
      return heuristic?.event ?? null;
    }

    throw error;
  }

  const parsed = safeJsonParse<{ slug?: string | null }>(extractModelText(response));
  const slug = String(parsed?.slug ?? '').trim();
  if (!slug || slug === 'none') {
    return heuristic?.event ?? null;
  }

  return MAJOR_HISTORICAL_EVENTS.find((event) => event.slug === slug) ?? heuristic?.event ?? null;
}
