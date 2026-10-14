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
   * Títulos por defecto según el tipo de aviso (`kind` del payload).
   *
   * Comercio → nuevo pedido; SuperAdmin → alerta de valoración; Cliente →
   * recordatorio de menú. Solo aplican cuando el payload no trae título: el
   * remitente (Edge Function) normalmente ya envía uno redactado.
   */
  var DEFAULT_TITLES_BY_KIND = {
    'new-order': '🛒 Nuevo pedido',
    'rating-alert': '⚠️ Alerta de valoración',
    'menu-reminder': '🍽️ ¿Qué se te antoja?',
  };

  /** Título legible del payload: el suyo, el de su kind o el genérico. */
  function resolveTitle(payload) {
    if (payload && typeof payload.title === 'string' && payload.title.trim() !== '') {
      return payload.title;
    }
    if (payload && typeof payload.kind === 'string' && DEFAULT_TITLES_BY_KIND[payload.kind]) {
      return DEFAULT_TITLES_BY_KIND[payload.kind];
    }
    return 'MenuGran';
  }

  /**
   * Sanea las acciones de la notificación que vienen en el payload.
   *
   * Chrome/Android muestra como máximo 2 botones; cada acción necesita un
   * `action` (id) y un `title` visibles. La URL de cada acción se guarda
   * aparte (en `data.actionUrls`) porque `NotificationAction` solo admite
   * action/title/icon.
   */
  function sanitizeActions(rawActions) {
    if (!Array.isArray(rawActions)) return [];
    var actions = [];
    for (var i = 0; i < rawActions.length && actions.length < 2; i += 1) {
      var entry = rawActions[i];
      if (!entry || typeof entry !== 'object') continue;
      if (typeof entry.action !== 'string' || entry.action === '') continue;
      if (typeof entry.title !== 'string' || entry.title.trim() === '') continue;
      actions.push({
        action: entry.action,
        title: entry.title,
        url: resolveTargetUrl(entry.url),
      });
    }
    return actions;
  }

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
    var actions = sanitizeActions(payload && payload.actions);
    var actionUrls = {};
    var visibleActions = [];
    var i;

    for (i = 0; i < actions.length; i += 1) {
      actionUrls[actions[i].action] = actions[i].url;
      visibleActions.push({ action: actions[i].action, title: actions[i].title });
    }

    var options = {
      body: (payload && payload.body) || '',
      icon: (payload && payload.icon) || '/pwa-192x192.png',
      badge: (payload && payload.badge) || '/pwa-192x192.png',
      // Sin `tag` propio cada mensaje necesita uno único: con una constante,
      // dos notificaciones simultáneas se reemplazaban y solo se veía la última.
      tag: (payload && payload.tag) || TAG_PREFIX + Date.now(),
      renotify: false,
      requireInteraction: false,
      data: { url: targetUrl, actionUrls: actionUrls },
    };

    if (visibleActions.length > 0) {
      options.actions = visibleActions;
    }

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

    event.waitUntil(
      scope.registration.showNotification(resolveTitle(payload), options)
    );
  });

  scope.addEventListener('notificationclick', function (event) {
    event.notification.close();

    var data = (event.notification && event.notification.data) || {};
    var actionUrls = data.actionUrls || {};
    var clickedAction = typeof event.action === 'string' ? event.action : '';

    // Clic en un botón de acción: abre la URL de esa acción; el cuerpo de la
    // notificación mantiene el deep link general del payload.
    var targetUrl = resolveTargetUrl(
      (clickedAction !== '' && actionUrls[clickedAction]) || data.url
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

  /** Horas de inicio de cada franja de comida (hora local del dispositivo). */
  var MENU_REMINDER_SLOTS = [9, 12, 19];

  /** Franja en la que no se molesta al usuario: madrugada y noche avanzada. */
  var QUIET_FROM_HOUR = 21;
  var QUIET_TO_HOUR = 5;

  /**
   * Franja vigente para la hora dada, o `null` si no toca avisar.
   *
   * Espejo de `resolveMenuReminderSlot` (src/utils/menuReminders.ts): el
   * navegador decide *cuándo* dispara `periodicsync` (no es una alarma), así
   * que la hora se comprueba aquí. Sin este filtro, una ejecución nocturna
   * mostraba el copy de cena a las 3 de la mañana.
   */
  function resolveReminderSlot(hour) {
    if (typeof hour !== 'number' || !isFinite(hour) || hour < 0 || hour > 23) return null;
    if (hour >= QUIET_FROM_HOUR || hour < QUIET_TO_HOUR) return null;

    for (var i = MENU_REMINDER_SLOTS.length - 1; i >= 0; i -= 1) {
      if (hour >= MENU_REMINDER_SLOTS[i]) return MENU_REMINDER_SLOTS[i];
    }
    return null;
  }

  /**
   * Copy del recordatorio de menú según la hora local del dispositivo.
   *
   * Las franjas coinciden con los cron jobs del backend (9:00 a.m., 12:00
   * p.m. y 7:00 p.m. hora de Venezuela); PeriodicSync dispara cuando el
   * navegador lo decida, así que el copy se elige con el reloj real.
   */
  function buildReminderCopy(hour) {
    if (hour >= 5 && hour < 11) {
      return {
        title: '☕ Buenos días',
        body: '¿Qué se te antoja desayunar? Hay comercios abiertos cerca de ti.',
      };
    }
    if (hour >= 11 && hour < 15) {
      return {
        title: '🍽️ Hora de almorzar',
        body: 'Mira los menús disponibles cerca de ti y pide antes de que se llene.',
      };
    }
    if (hour >= 15 && hour < 21) {
      return {
        title: '🌙 Hora de cenar',
        body: 'Termina el día con tu plato favorito, a la puerta de tu casa.',
      };
    }
    return {
      title: '🍽️ ¿Qué se te antoja?',
      body: 'Descubre los menús de MenuGran disponibles cerca de ti.',
    };
  }

  /**
   * Recordatorios programados vía Background Periodic Sync.
   *
   * El registro del tag `menugram-reminders` lo hace `usePushNotifications`
   * cuando el usuario concede el permiso; los horarios exactos los garantiza
   * el Web Push del backend (cron jobs), esto es el refuerzo local.
   *
   * Solo muestra aviso si la hora local cae dentro de una franja de comida:
   * el navegador dispara el evento cuando quiere (y con más frecuencia de la
   * solicitada), así que hay que comprobar el reloj aquí para no avisar de
   * madrugada ni saltarse la franja.
   */
  scope.addEventListener('periodicsync', function (event) {
    if (!event || event.tag !== 'menugram-reminders') return;

    var hour = new Date().getHours();
    if (resolveReminderSlot(hour) === null) return;

    var copy = buildReminderCopy(hour);

    event.waitUntil(
      scope.registration.showNotification(copy.title, {
        body: copy.body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'menugram-menu-reminder',
        data: { url: '/marketplace' },
      })
    );
  });

  // Superficie de pruebas: el resto del archivo no depende del DOM.
  scope.__pushHandlerTest = {
    FALLBACK_URL: FALLBACK_URL,
    DEFAULT_TITLES_BY_KIND: DEFAULT_TITLES_BY_KIND,
    resolveTargetUrl: resolveTargetUrl,
    normalizePathname: normalizePathname,
    isShowingTarget: isShowingTarget,
    readPushPayload: readPushPayload,
    isReminderPayload: isReminderPayload,
    buildNotificationOptions: buildNotificationOptions,
    resolveTitle: resolveTitle,
    sanitizeActions: sanitizeActions,
    buildReminderCopy: buildReminderCopy,
    resolveReminderSlot: resolveReminderSlot,
  };
})(typeof self !== 'undefined' ? self : this);