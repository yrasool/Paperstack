import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyIfMissing(sourcePath, targetPath) {
  if (!existsSync(sourcePath) || existsSync(targetPath)) {
    return;
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);
}

rmSync(join(cwd, '.next'), { force: true, recursive: true });

run(npxCommand, ['next', 'build'], {
  ...process.env,
  NEXT_PRIVATE_WORKER_THREADS: 'false',
});

const fallbackPagesManifest = JSON.stringify(
  {
    '/_app': 'pages/_app.js',
    '/_document': 'pages/_document.js',
    '/_error': 'pages/_error.js',
  },
  null,
  2,
);
const rootPackageJsonPath = join(cwd, 'package.json');
const nextPackageJsonPath = join(cwd, '.next', 'package.json');

copyIfMissing(rootPackageJsonPath, nextPackageJsonPath);

const rootNextDir = join(cwd, '.next');
const standaloneNextDir = join(cwd, '.next', 'standalone', '.next');

mkdirSync(standaloneNextDir, { recursive: true });

for (const fileName of [
  'BUILD_ID',
  'build-manifest.json',
  'app-build-manifest.json',
  'app-path-routes-manifest.json',
  'dynamic-css-manifest.json',
  'react-loadable-manifest.json',
  'package.json',
]) {
  copyIfMissing(join(rootNextDir, fileName), join(standaloneNextDir, fileName));
}

for (const manifestPath of [
  join(cwd, '.next', 'server', 'pages-manifest.json'),
  join(cwd, '.next', 'standalone', '.next', 'server', 'pages-manifest.json'),
]) {
  if (!existsSync(manifestPath)) {
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, fallbackPagesManifest, 'utf8');
  }
}

const standaloneDotNextRoot = join(cwd, '.next', 'standalone', '.next');
const standaloneServerDir = join(standaloneDotNextRoot, 'server');
mkdirSync(standaloneDotNextRoot, { recursive: true });
mkdirSync(standaloneServerDir, { recursive: true });

for (const fileName of [
  'BUILD_ID',
  'required-server-files.json',
  'routes-manifest.json',
  'prerender-manifest.json',
  'images-manifest.json',
  'app-build-manifest.json',
  'build-manifest.json',
  'react-loadable-manifest.json',
  'package.json',
]) {
  const source = join(cwd, '.next', fileName);
  const target = join(standaloneDotNextRoot, fileName);
  if (existsSync(source) && !existsSync(target)) {
    copyFileSync(source, target);
  }
}

const serverManifestSourceDir = join(cwd, '.next', 'server');
const serverManifestFileNames = readdirSync(serverManifestSourceDir).filter((fileName) => {
  if (fileName === 'functions-config-manifest.json') return true;
  return /manifest\.(json|js)$/i.test(fileName);
});

for (const fileName of serverManifestFileNames) {
  copyIfMissing(join(serverManifestSourceDir, fileName), join(standaloneServerDir, fileName));
}

for (const pagesDir of [
  join(cwd, '.next', 'server', 'pages'),
  join(cwd, '.next', 'standalone', '.next', 'server', 'pages'),
]) {
  mkdirSync(pagesDir, { recursive: true });
  for (const fileName of ['_app.js', '_document.js', '_error.js']) {
    const filePath = join(pagesDir, fileName);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, 'module.exports = {};', 'utf8');
    }
  }
}

const tracedRuntimeDir = join(
  cwd,
  '.next',
  'standalone',
  'node_modules',
  'next',
  'dist',
  'compiled',
  'next-server',
);

if (existsSync(tracedRuntimeDir)) {
  const openNextRuntimeDir = join(
    cwd,
    '.open-next',
    'server-functions',
    'default',
    'node_modules',
    'next',
    'dist',
    'compiled',
    'next-server',
  );
  mkdirSync(openNextRuntimeDir, { recursive: true });

  for (const fileName of readdirSync(tracedRuntimeDir)) {
    if (!fileName.includes('experimental.runtime.prod')) continue;
    const source = join(tracedRuntimeDir, fileName);
    const target = join(openNextRuntimeDir, fileName);
    copyFileSync(source, target);
  }
}
