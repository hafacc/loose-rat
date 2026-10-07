/** Saves the site's files so it works without a connection. */

import { version } from "$app/env";
import { assets, immutable, prerendered } from "$app/manifest";
import { self } from "$app/service-worker";

const CACHE = `site-${version}`;
// the page's own path is empty, which alone would name this file
const PATHS = [...immutable, ...assets, ...prerendered].map(
  ({ path }) => `./${path}`,
);

async function save(): Promise<void> {
  const cache = await caches.open(CACHE);
  await cache.addAll(PATHS);
}

async function dropOld(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => name !== CACHE).map((name) => caches.delete(name)),
  );
}

async function respond(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  return (await cache.match(request)) ?? (await fetch(request));
}

self.addEventListener("install", (event) => {
  event.waitUntil(save());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(dropOld());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method === "GET") {
    event.respondWith(respond(event.request));
  }
});
