import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Standalone config: the app's vite.config.ts pulls in TanStack Start / Nitro plugins that
// are not needed (and slow) for pure-logic unit tests.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
