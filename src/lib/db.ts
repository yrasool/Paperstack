/// <reference types="@cloudflare/workers-types" />

import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface PaperstackBindings {
  DB: D1Database;
  ASSETS: Fetcher;
  PAPERSTACK_MEDIA: R2Bucket;
  AI: Ai;
  PAPERSTACK_ADMIN_TOKEN?: string;
  SMITHSONIAN_API_KEY?: string;
  DATA_GOV_API_KEY?: string;
}

export function getBindings(): PaperstackBindings {
  const { env } = getCloudflareContext() as unknown as { env: PaperstackBindings };
  return env;
}

export function getDB(): D1Database {
  return getBindings().DB;
}
