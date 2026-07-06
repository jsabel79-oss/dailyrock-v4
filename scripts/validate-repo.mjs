import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = ['App.js', 'app.json', 'babel.config.js', 'index.js', 'package.json'];
const forbiddenFiles = ['index.html', 'src/main.js', 'src/styles.css', 'vite.config.js'];
const requiredScripts = {
  start: 'expo start',
  android: 'expo start --android',
  ios: 'expo start --ios',
  web: 'expo start --web',
};
const requiredDependencies = ['expo', 'expo-status-bar', 'react', 'react-native'];
const failures = [];

await Promise.all(
  requiredFiles.map(async (filePath) => {
    try {
      await access(path.join(root, filePath), constants.R_OK);
    } catch {
      failures.push(`Missing required readable Expo file: ${filePath}`);
    }
  }),
);

await Promise.all(
  forbiddenFiles.map(async (filePath) => {
    try {
      await access(path.join(root, filePath), constants.F_OK);
      failures.push(`Found legacy web/Vite artifact that should not be part of the Expo app: ${filePath}`);
    } catch {
      // Expected: the legacy artifact is absent.
    }
  }),
);

const [appSource, indexSource, packageSource, babelSource] = await Promise.all([
  readFile(path.join(root, 'App.js'), 'utf8'),
  readFile(path.join(root, 'index.js'), 'utf8'),
  readFile(path.join(root, 'package.json'), 'utf8'),
  readFile(path.join(root, 'babel.config.js'), 'utf8'),
]);

let packageJson;
try {
  packageJson = JSON.parse(packageSource);
} catch (error) {
  failures.push(`package.json is not valid JSON: ${error.message}`);
  packageJson = {};
}

if (packageJson.main !== 'index.js') {
  failures.push('package.json must use the native Expo entrypoint: "main": "index.js"');
}

for (const [scriptName, expectedCommand] of Object.entries(requiredScripts)) {
  if (packageJson.scripts?.[scriptName] !== expectedCommand) {
    failures.push(`package.json script "${scriptName}" must be "${expectedCommand}"`);
  }
}

for (const dependencyName of requiredDependencies) {
  if (!packageJson.dependencies?.[dependencyName]) {
    failures.push(`package.json must include Expo dependency: ${dependencyName}`);
  }
}

for (const unexpectedScript of ['dev', 'preview']) {
  if (packageJson.scripts?.[unexpectedScript]) {
    failures.push(`package.json must not keep legacy web script: ${unexpectedScript}`);
  }
}

for (const expectedText of ['Daily Rock', 'ghostSchedule', 'categories', 'PanResponder']) {
  if (!appSource.includes(expectedText)) {
    failures.push(`Expected Expo React Native app source to include: ${expectedText}`);
  }
}

if (!indexSource.includes("registerRootComponent(App)")) {
  failures.push('index.js must register the React Native root component with Expo.');
}

if (!babelSource.includes('babel-preset-expo')) {
  failures.push('babel.config.js must use babel-preset-expo.');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Expo React Native application validation passed.');
console.log('Verified package.json scripts: start, android, ios, web.');
