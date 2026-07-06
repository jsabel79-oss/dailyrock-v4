# Daily Rock v4

Daily Rock is a complete Expo React Native project. It uses the standard Expo entrypoint (`index.js`), Expo app manifest (`app.json`), Babel configuration (`babel.config.js`), and React Native application source (`App.js`).

## Run locally

```sh
npm install
npm start
```

## Verification

```sh
npm run build
npm run verify:zip
```

`npm run verify:zip` builds the same downloadable ZIP format produced from the current Git commit with `git archive` and checks that every required Expo project file is present.
