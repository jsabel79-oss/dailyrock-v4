import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = ['index.html', 'src/main.js', 'src/styles.css'];
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const referencedAssets = [...html.matchAll(/(?:href|src)="\/([^"]+)"/g)].map((match) => match[1]);

const failures = [];

await Promise.all(
  [...requiredFiles, ...referencedAssets].map(async (filePath) => {
    try {
      await access(path.join(root, filePath), constants.R_OK);
    } catch {
      failures.push(`Missing required readable file: ${filePath}`);
    }
  }),
);

if (!html.includes('<main class="app">')) {
  failures.push('index.html must include the app shell.');
}

if (!html.includes('id="timeline"')) {
  failures.push('index.html must include the timeline mount point.');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Repository state validation passed.');
