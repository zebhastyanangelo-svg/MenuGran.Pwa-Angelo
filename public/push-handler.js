/*
 * push-handler.js — Manejo de Web Push para el Service Worker de MenuGram.
 *
 * El SW principal (dist/sw.js) es generado por Workbox (vite-plugin-pwa,
 * modo generateSW) y no admite código custom, por eso este archivo se inyecta
 * vía `workbox.importScripts` en vite.config.ts.
 *
 * Responsabilidades:
 *  1. Recibir el evento `push` y mostrar el popup con
 *     self.registration.showNotification(title, options).
 *  2. Identificar clics en la notificación (`notificationclick`) y abrir o
 *     enfocar la app en la URL indicada por el payload.
 *
 * Payload esperado (JSON enviado por la Edge Function send-push-notification):
 *  { title, body, url?, tag?, icon?, badge? }
 */
/* eslint-env worker */

self.addEventListener('push', function (event) {
  var payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    try {
      payload = { body: event.data ? event.data.text() : '' };
    } catch {
      payload = {};
    }
  }

  var title = (payload && payload.title) || 'MenuGram';
  var url = (payload && payload.url) || '/marketplace';

  var options = {
    body: (payload && payload.body) || '',
    icon: (payload && payload.icon) || '/pwa-192x192.png',
    badge: (payload && payload.badge) || '/pwa-192x192.png',
    tag: (payload && payload.tag) || 'menugram-notification',
    renotify: false,
    data: { url: url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var url = '/marketplace';
  try {
    if (event.notification.data && event.notification.data.url) {
      url = event.notification.data.url;
    }
  } catch {
    url = '/marketplace';
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        for (var i = 0; i < clientList.length; i++) {
          var client = clientList[i];
          var clientPath = '/' + String(client.url).split('/')[3];
          if (clientPath === url && 'focus' in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
