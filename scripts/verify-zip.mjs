import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const requiredFiles = [
  'App.js',
  'app.json',
  'babel.config.js',
  'index.js',
  'package.json',
  'scripts/validate-repo.mjs',
  'scripts/verify-zip.mjs',
];

const legacyFiles = [
  'index.html',
  'src/main.js',
  'src/styles.css',
  'vite.config.js',
];

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'dailyrock-zip-'));
const zipPath = path.join(tempDir, 'dailyrock-v4.zip');

try {
  await execFileAsync('git', ['archive', '--format=zip', `--output=${zipPath}`, 'HEAD'], {
    cwd: process.cwd(),
  });

  const { stdout } = await execFileAsync('unzip', ['-Z1', zipPath]);
  const entries = new Set(stdout.trim().split('\n').filter(Boolean));
  const failures = [];

  for (const filePath of requiredFiles) {
    if (!entries.has(filePath)) {
      failures.push(`ZIP is missing required Expo project file: ${filePath}`);
    }
  }

  for (const filePath of legacyFiles) {
    if (entries.has(filePath)) {
      failures.push(`ZIP contains legacy web/Vite file that should be absent: ${filePath}`);
    }
  }

  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }

  console.log(`Verified downloadable ZIP from HEAD: ${zipPath}`);
  console.log(`Required Expo files present: ${requiredFiles.join(', ')}`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
