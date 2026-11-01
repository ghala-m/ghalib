import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// After a new publish, old page files disappear; reload once to fetch the fresh version.
if (typeof window !== "undefined" && !(window as any).__chunkReloadInstalled) {
  (window as any).__chunkReloadInstalled = true;
  const KEY = "chunk-reload-at";
  const reloadOnce = () => {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  };
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    reloadOnce();
  });
  const isChunkError = (msg: string) =>
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg);
  window.addEventListener("error", (e) => {
    if (isChunkError(String(e.message || ""))) reloadOnce();
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (isChunkError(String((e.reason as Error)?.message || e.reason || ""))) reloadOnce();
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
