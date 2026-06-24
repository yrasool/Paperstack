import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const nodeCommand = process.platform === 'win32' ? 'node.exe' : 'node';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyIfExists(source, target) {
  if (!existsSync(source)) return;
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(source, target);
}

function patchRuntimeMiddlewareManifestLoad() {
  const runtimeFiles = [
    path.join(
      cwd,
      '.open-next',
      'server-functions',
      'default',
      'handler.mjs',
    ),
    path.join(
      cwd,
      '.open-next',
      'server-functions',
      'default',
      'index.mjs',
    ),
  ];
  const target =
    'getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}';
  const replacement =
    'getMiddlewareManifest(){return this.minimalMode?null:(0,_loadmanifest.loadManifest)(this.middlewareManifestPath)}';

  for (const runtimeFile of runtimeFiles) {
    if (!existsSync(runtimeFile)) {
      continue;
    }

    const source = readFileSync(runtimeFile, 'utf8');
    if (!source.includes(target)) {
      continue;
    }

    writeFileSync(runtimeFile, source.replace(target, replacement), 'utf8');
  }
}

function patchAbsoluteRuntimeRequirePaths() {
  const runtimeDir = path.join(
    cwd,
    '.open-next',
    'server-functions',
    'default',
  );
  const absolutePrefix = `${runtimeDir.split(path.sep).join('/')}/`;

  if (!existsSync(runtimeDir)) {
    return;
  }

  for (const fileName of readdirSync(runtimeDir)) {
    if (!/\.(mjs|cjs|js)$/i.test(fileName)) {
      continue;
    }

    const filePath = path.join(runtimeDir, fileName);
    const source = readFileSync(filePath, 'utf8');
    if (!source.includes(absolutePrefix)) {
      continue;
    }

    writeFileSync(
      filePath,
      source.replaceAll(absolutePrefix, './'),
      'utf8',
    );
  }
}

function seedOpenNextScaffolding() {
  const templateRoot = path.join(
    cwd,
    'node_modules',
    '@opennextjs',
    'cloudflare',
    'dist',
    'cli',
    'templates',
  );
  const shimRoot = path.join(templateRoot, 'shims');
  const outputRoot = path.join(cwd, '.open-next');
  const outputShimRoot = path.join(outputRoot, 'cloudflare-templates', 'shims');
  const serverFunctionRoot = path.join(outputRoot, 'server-functions', 'default');
  const awsAdapterRoot = path.join(
    cwd,
    'node_modules',
    '@opennextjs',
    'cloudflare',
    'node_modules',
    '@opennextjs',
    'aws',
    'dist',
    'adapters',
  );

  mkdirSync(outputShimRoot, { recursive: true });
  mkdirSync(serverFunctionRoot, { recursive: true });

  for (const fileName of ['env.js', 'empty.js', 'throw.js', 'fetch.js']) {
    copyIfExists(path.join(shimRoot, fileName), path.join(outputShimRoot, fileName));
  }

  copyIfExists(path.join(templateRoot, 'worker.js'), path.join(outputRoot, 'worker.js'));
  copyIfExists(path.join(awsAdapterRoot, 'cache.js'), path.join(serverFunctionRoot, 'cache.cjs'));
  copyIfExists(path.join(awsAdapterRoot, 'composable-cache.js'), path.join(serverFunctionRoot, 'composable-cache.cjs'));
}

rmSync(path.join(cwd, '.open-next'), { recursive: true, force: true });
run(nodeCommand, ['scripts/next-build.mjs']);
seedOpenNextScaffolding();
run(npxCommand, ['opennextjs-cloudflare', 'build', '--skipNextBuild']);
patchRuntimeMiddlewareManifestLoad();
patchAbsoluteRuntimeRequirePaths();
