// ESLint do aplicativo: regras do Expo (React, React Native, hooks e
// importações) com o Prettier cuidando da formatação. Ver
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', 'dist-web/*', '.expo/*', 'scripts/*'],
  },
]);
