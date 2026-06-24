/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  ASSETS: Fetcher;
  PAPERSTACK_MEDIA: R2Bucket;
  AI: Ai;
  PAPERSTACK_ADMIN_TOKEN?: string;
  SMITHSONIAN_API_KEY?: string;
  DATA_GOV_API_KEY?: string;
}

interface PaperstackEnv extends CloudflareEnv {}
