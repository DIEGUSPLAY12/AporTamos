// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'dist/',
      'build/',
      '*.min.js',
      '.vscode/',
      '.next/',
      'coverage/',
      '__generated__',
      '.env',
      '.env.local',
      '.env.*.local',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
    ],
  },
  expoConfig,
]);
