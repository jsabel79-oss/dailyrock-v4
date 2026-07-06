import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = ['App.js', 'app.json', 'babel.config.js', 'package.json'];
const failures = [];

await Promise.all(
  requiredFiles.map(async (filePath) => {
    try {
      await access(path.join(root, filePath), constants.R_OK);
    } catch {
      failures.push(`Missing required readable file: ${filePath}`);
    }
  }),
);

const appSource = await readFile(path.join(root, 'App.js'), 'utf8');
const packageSource = await readFile(path.join(root, 'package.json'), 'utf8');

for (const expectedText of ['Daily Rock', 'ghostSchedule', 'categories', 'PanResponder', 'expo start']) {
  const source = expectedText === 'expo start' ? packageSource : appSource;
  if (!source.includes(expectedText)) {
    failures.push(`Expected Expo app source to include: ${expectedText}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Expo application validation passed.');
