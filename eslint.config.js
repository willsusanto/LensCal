/* eslint-disable @typescript-eslint/no-require-imports */
const nextVitals = require("eslint-config-next/core-web-vitals");
const nextTypescript = require("eslint-config-next/typescript");

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "public/sw.js",
      "public/swe-worker-*.js",
      "public/workbox-*.js",
      "public/worker-*.js",
    ],
  },
];
