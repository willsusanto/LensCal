/* eslint-disable @typescript-eslint/no-require-imports */
const nextVitals = require("eslint-config-next/core-web-vitals");
const nextTypescript = require("eslint-config-next/typescript");

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["providers/lens-provider.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: [".next/**", "public/sw.js", "public/swe-worker-*.js", "public/workbox-*.js"],
  },
];
