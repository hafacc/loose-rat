// Earlier versions of the site registered this file and saved their own copy of every
// page. Without it they would keep showing that copy, so it removes itself and reloads.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.map((client) => client.navigate(client.url))),
  );
});
