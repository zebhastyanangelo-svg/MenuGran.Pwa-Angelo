import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runMenuReminderTick } from './useMenuReminderTimer';
import { MENU_REMINDER_STORAGE_KEY } from '../utils/menuReminders';

let showNotificationMock: ReturnType<typeof vi.fn>;

function setupNotification(permission: string): void {
  showNotificationMock = vi.fn().mockResolvedValue(undefined);
  const registration = { showNotification: showNotificationMock };

  const MockNotification = vi.fn() as unknown as typeof Notification;
  Object.defineProperty(MockNotification, 'permission', { value: permission });
  Object.defineProperty(MockNotification, 'requestPermission', {
    value: vi.fn().mockResolvedValue(permission),
  });

  vi.stubGlobal('Notification', MockNotification);
  vi.stubGlobal('navigator', {
    ...(globalThis as { navigator?: object }).navigator,
    serviceWorker: { ready: Promise.resolve(registration) },
  });
}

describe('runMenuReminderTick', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('no hace nada sin soporte de notificaciones', async () => {
    vi.stubGlobal('Notification', undefined);
    await expect(runMenuReminderTick(new Date(2026, 9, 12, 13, 0))).resolves.toBe(false);
  });

  it('no hace nada con el permiso denegado', async () => {
    setupNotification('denied');
    await expect(runMenuReminderTick(new Date(2026, 9, 12, 13, 0))).resolves.toBe(false);
    expect(showNotificationMock).not.toHaveBeenCalled();
  });

  it('muestra el recordatorio y marca la franja cuando toca', async () => {
    setupNotification('granted');
    await expect(runMenuReminderTick(new Date(2026, 9, 12, 13, 0))).resolves.toBe(true);

    expect(showNotificationMock).toHaveBeenCalledTimes(1);
    const [title, options] = showNotificationMock.mock.calls[0] as [string, { tag: string }];
    expect(title).toContain('almorzar');
    expect(options.tag).toBe('menugram-menu-reminder');

    const log = JSON.parse(
      window.localStorage.getItem(MENU_REMINDER_STORAGE_KEY) ?? '{}',
    ) as Record<string, number[]>;
    expect(log['2026-10-12']).toEqual([12]);
  });

  it('no repite el recordatorio si la franja ya se mostró hoy', async () => {
    setupNotification('granted');
    await runMenuReminderTick(new Date(2026, 9, 12, 13, 0));
    await expect(runMenuReminderTick(new Date(2026, 9, 12, 14, 0))).resolves.toBe(false);
    expect(showNotificationMock).toHaveBeenCalledTimes(1);
  });

  it('no muestra nada fuera de las franjas de comida', async () => {
    setupNotification('granted');
    await expect(runMenuReminderTick(new Date(2026, 9, 12, 22, 0))).resolves.toBe(false);
    expect(showNotificationMock).not.toHaveBeenCalled();
  });

  it('no marca la franja si el envío falla', async () => {
    setupNotification('granted');
    showNotificationMock.mockRejectedValueOnce(new Error('sw caído'));
    (globalThis as unknown as { Notification: unknown }).Notification = vi
      .fn()
      .mockImplementation(() => {
        throw new Error('sin constructor');
      });

    await expect(runMenuReminderTick(new Date(2026, 9, 12, 13, 0))).resolves.toBe(false);
    expect(window.localStorage.getItem(MENU_REMINDER_STORAGE_KEY)).toBeNull();
  });
});
