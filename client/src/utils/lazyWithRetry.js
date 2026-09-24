import { lazy } from 'react';

/**
 * Checks whether an error is caused by a missing/stale JavaScript chunk
 * (common when a new deployment invalidates old hashed filenames).
 */
export const isChunkLoadError = (error) => {
  if (!error) return false;
  const msg = error?.message || error?.toString() || '';
  return (
    error?.name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk/i.test(msg) ||
    /Unexpected token '<'/i.test(msg) // Returned when server returns 404 HTML instead of JS chunk
  );
};

/**
 * Enhanced React.lazy that automatically recovers from deployment desyncs.
 * If a chunk 404s after a new build is deployed, this transparently reloads
 * the page once to pull the fresh index.html and latest assets.
 */
export const lazyWithRetry = (importer, chunkKey = 'default') => {
  return lazy(async () => {
    const storageKey = `chunk_reload_${chunkKey}`;
    const alreadyRetried = sessionStorage.getItem(storageKey);

    try {
      const module = await importer();
      // Reset retry flag on successful module load
      sessionStorage.removeItem(storageKey);
      return module;
    } catch (error) {
      if (isChunkLoadError(error) && !alreadyRetried) {
        // Mark that we attempted a reload for this chunk to prevent infinite loops
        sessionStorage.setItem(storageKey, 'true');
        // Seamlessly reload to grab new index.html with up-to-date chunk hashes
        window.location.reload();
        // Return unresolved promise while browser completes reload
        return new Promise(() => {});
      }

      // If already retried or not a chunk mismatch, rethrow
      sessionStorage.removeItem(storageKey);
      throw error;
    }
  });
};

export default lazyWithRetry;
