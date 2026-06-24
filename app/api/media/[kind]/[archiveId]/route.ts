import { streamCachedMedia, type PaperstackMediaKind } from '@/lib/media';

interface RouteContext {
  params: Promise<{
    kind: string;
    archiveId: string;
  }>;
}

function isMediaKind(value: string): value is PaperstackMediaKind {
  return value === 'newspaper' || value === 'image' || value === 'video';
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  const archiveId = decodeURIComponent(params.archiveId ?? '');
  const kind = params.kind ?? '';

  if (!archiveId || !isMediaKind(kind)) {
    return new Response('Invalid media request.', { status: 400 });
  }

  return streamCachedMedia(kind, archiveId);
}
