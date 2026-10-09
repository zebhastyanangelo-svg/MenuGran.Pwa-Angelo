/*
 * push-handler.js — Manejo de Web Push para el Service Worker de MenuGran.
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
 *  { title, body, url?, tag?, icon?, badge?, reminder?, kind?, timestamp? }
 *
 * Los payloads marcados como recordatorio (`reminder: true`) se muestran como
 * alertas activas persistentes: no se descartan solas, vibran y re-alertan.
 *
 * Script clásico (no ESM) porque `importScripts` lo carga así. Para poder
 * probarlo desde vitest, las funciones se cuelgan de `self.__pushHandlerTest`.
 */
/* eslint-env worker */

(function (scope) {
  'use strict';

  /** Destino cuando el payload no trae una ruta utilizable. */
  var FALLBACK_URL = '/marketplace';

  /** Prefijo de los tags generados cuando el payload no trae uno. */
  var TAG_PREFIX = 'menugram-';

  /**
   * Sanea la URL de destino.
   *
   * Solo se aceptan rutas internas: un payload con esquema propio (`https:`) o
   * protocol-relative (`//host`) podría sacar al cliente de la PWA hacia un
   * origen ajeno, así que caen al destino por defecto.
   */
  function resolveTargetUrl(rawUrl) {
    if (typeof rawUrl !== 'string') return FALLBACK_URL;
    var value = rawUrl.trim();
    if (value === '') return FALLBACK_URL;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.indexOf('//') === 0) {
      return FALLBACK_URL;
    }
    return value.charAt(0) === '/' ? value : '/' + value;
  }

  /**
   * Reduce una URL a su ruta comparable: sin query, sin hash y sin barra final.
   *
   * La comparación anterior (`url.split('/')[3]`) solo resolvía rutas de un
   * único segmento, de modo que un deep link como `/orders/123` nunca enfocaba
   * la pestaña abierta y el clic terminaba abriendo una segunda copia de la PWA.
   */
  function normalizePathname(rawPath) {
    var value = String(rawPath || '').split('?')[0].split('#')[0];
    if (value.length > 1 && value.charAt(value.length - 1) === '/') {
      value = value.slice(0, -1);
    }
    return value === '' ? '/' : value;
  }

  function pathOf(clientUrl) {
    try {
      return normalizePathname(new URL(String(clientUrl)).pathname);
    } catch {
      return '/';
    }
  }

  /** `true` si el cliente ya está mostrando ese destino. */
  function isShowingTarget(clientUrl, targetPath) {
    return pathOf(clientUrl) === normalizePathname(targetPath);
  }

  /**
   * Lee el payload tolerando JSON inválido y payloads cifrados o vacíos.
   * Antes, un cuerpo que no era JSON perdía el título y mostraba "MenuGran".
   */
  function readPushPayload(event) {
    if (!event || !event.data) return {};
    try {
      var parsed = event.data.json();
      if (parsed && typeof parsed === 'object') return parsed;
      return { body: String(parsed) };
    } catch {
      try {
        return { body: event.data.text() };
      } catch {
        return {};
      }
    }
  }

  /**
   * Opciones de la notificación a partir del payload.
   *
   * Payloads con `reminder: true` (o `kind: 'reminder'`) se muestran como
   * recordatorios activos: permanecen en pantalla hasta que el usuario
   * interactúa (`requireInteraction`), vibran y vuelven a alertar sobre la
   * notificación previa del mismo tag (`renotify`). Así el aviso sigue visible
   * con la pantalla bloqueada y no desaparece solo.
   */
  function isReminderPayload(payload) {
    if (!payload) return false;
    if (payload.reminder === true) return true;
    return payload.kind === 'reminder';
  }

  function buildNotificationOptions(payload, targetUrl) {
    var options = {
      body: (payload && payload.body) || '',
      icon: (payload && payload.icon) || '/pwa-192x192.png',
      badge: (payload && payload.badge) || '/pwa-192x192.png',
      // Sin `tag` propio cada mensaje necesita uno único: con una constante,
      // dos notificaciones simultáneas se reemplazaban y solo se veía la última.
      tag: (payload && payload.tag) || TAG_PREFIX + Date.now(),
      renotify: false,
      requireInteraction: false,
      data: { url: targetUrl },
    };

    if (isReminderPayload(payload)) {
      options.renotify = true;
      options.requireInteraction = true;
      options.silent = false;
      options.vibrate = [300, 150, 300];
      if (payload.timestamp && typeof payload.timestamp === 'number') {
        options.timestamp = payload.timestamp;
      }
    }

    return options;
  }

  scope.addEventListener('push', function (event) {
    var payload = readPushPayload(event);
    var targetUrl = resolveTargetUrl(payload.url);

    var options = buildNotificationOptions(payload, targetUrl);

    event.waitUntil(scope.registration.showNotification(payload.title || 'MenuGran', options));
  });

  scope.addEventListener('notificationclick', function (event) {
    event.notification.close();

    var targetUrl = resolveTargetUrl(
      event.notification && event.notification.data && event.notification.data.url
    );

    event.waitUntil(
      scope.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clientList) {
          var i;
          var existing;

          for (i = 0; i < clientList.length; i += 1) {
            existing = clientList[i];
            if (isShowingTarget(existing.url, targetUrl) && 'focus' in existing) {
              return existing.focus();
            }
          }

          // La PWA ya está abierta en otra pantalla: se reutiliza esa ventana
          // en vez de abrir una segunda copia que compite por el mismo usuario.
          for (i = 0; i < clientList.length; i += 1) {
            existing = clientList[i];
            if ('focus' in existing && typeof existing.navigate === 'function') {
              return existing.focus().then(function (focusedClient) {
                return focusedClient.navigate(targetUrl);
              });
            }
          }

          return scope.clients.openWindow(targetUrl);
        })
    );
  });

  // Superficie de pruebas: el resto del archivo no depende del DOM.
  scope.__pushHandlerTest = {
    FALLBACK_URL: FALLBACK_URL,
    resolveTargetUrl: resolveTargetUrl,
    normalizePathname: normalizePathname,
    isShowingTarget: isShowingTarget,
    readPushPayload: readPushPayload,
    isReminderPayload: isReminderPayload,
    buildNotificationOptions: buildNotificationOptions,
  };
})(typeof self !== 'undefined' ? self : this);