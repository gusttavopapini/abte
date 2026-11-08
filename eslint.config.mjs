import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Substitui as pastas ignoradas por padrão no eslint-config-next.
  globalIgnores([
    // Pastas ignoradas por padrão no eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Saída privada dos scripts de migração e de entrega (fora do Git, 08/11/2026).
    "tmp-migracao/**",
  ]),
]);

export default eslintConfig;
