import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST?: (PrecacheEntry | string)[]; // Add the __SW_MANIFEST property
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST, // Now TypeScript recognizes __SW_MANIFEST
  skipWaiting: true,
  clientsClaim: true,
});

serwist.addEventListeners();