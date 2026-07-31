const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/database/*'],
          message: 'Screens and features must access persistence through services.'
        }]
      }]
    }
  },
  {
    files: ['src/services/**/*.{ts,tsx}', 'src/database/**/*.{ts,tsx}', 'src/providers/**/*.{ts,tsx}', 'src/__tests__/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' }
  }
]);
