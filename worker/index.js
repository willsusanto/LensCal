self.addEventListener('push', (event) => {
  if (!event.data) return;

  event.waitUntil(
    (async () => {
      let payload;

      try {
        payload = event.data.json();
      } catch {
        payload = {
          title: 'LensCal reminder',
          options: {
            body: event.data.text(),
          },
        };
      }

      await self.registration.showNotification(payload.title ?? 'LensCal reminder', {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...payload.options,
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url ?? '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })(),
  );
});
