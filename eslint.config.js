// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  { ignores: ["dist/**", ".gradle-local/**", ".jdk/**", "android/**", "ios/**"] },
  expoConfig,
  {
    files: ["server/**/*.mjs"],
    languageOptions: { globals: { Buffer: "readonly" } },
  }
]);
