import { VERSION } from 'ember-service-worker-request-deferer/service-worker/config';
import cleanupCaches from 'ember-service-worker/service-worker/cleanup-caches';

const CACHE_KEY_PREFIX = 'esw-request-deferer';
const CACHE_NAME = `${CACHE_KEY_PREFIX}-${VERSION}`;

self.addEventListener('fetch', (event) => {
  let request = event.request;
  debugger;
});

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanupCaches(CACHE_KEY_PREFIX, CACHE_NAME));
});
