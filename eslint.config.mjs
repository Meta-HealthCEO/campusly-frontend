import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // The React Compiler lint wants data loading out of effects, but this
      // codebase's sanctioned hook recipe (CLAUDE.md "Data Fetching Pattern")
      // fetches inside useEffect. Keep the signal visible without failing
      // the build; revisit if/when the compiler is enabled.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
