import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  distDir: '.next',
  outputFileTracingRoot: __dirname,
};

export default config;
