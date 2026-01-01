import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default tseslint.config(
  // Extend Next.js config using compatibility layer
  ...compat.extends("next/core-web-vitals"),

  // TypeScript ESLint recommended config
  ...tseslint.configs.recommended,

  // Global ignores
  {
    ignores: ["e2e/**", "playwright-report/**", ".next/**", "node_modules/**"],
  },

  // Custom rules
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  }
);
