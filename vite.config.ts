// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Works around "RangeError: Invalid WebSocket frame: RSV1 must be clear" crashing the dev
  // server during HMR. That error means something between the browser and this process is
  // altering the WebSocket frames — almost always a VPN client, corporate proxy, or antivirus
  // doing traffic inspection (Cisco AnyConnect is a very common culprit). Disabling
  // compression negotiation on the socket is the standard workaround, since compressed frames
  // are what gets corrupted. If it still crashes, temporarily disconnecting the VPN and
  // reloading is the more reliable fix.
  vite: {
    server: {
      ws: { perMessageDeflate: false } as Record<string, unknown>,
    },
  },
});
