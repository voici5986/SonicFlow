export const clearBrowserCaches = async () => {
  const registrations =
    'serviceWorker' in (globalThis.navigator ?? {})
      ? await globalThis.navigator.serviceWorker.getRegistrations()
      : [];
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if (!('caches' in globalThis)) {
    return { deletedCaches: 0, unregisteredWorkers: registrations.length };
  }

  const cacheNames = await globalThis.caches.keys();
  const results = await Promise.all(
    cacheNames.map((cacheName) => globalThis.caches.delete(cacheName))
  );
  return {
    deletedCaches: results.filter(Boolean).length,
    unregisteredWorkers: registrations.length,
  };
};
