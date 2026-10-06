import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  SERVICE_MODE_KEY,
  clearServiceMode,
  isServiceModeSessionResolved,
  isValidServiceMode,
  readServiceMode,
  saveServiceMode,
  subscribeToServiceMode,
} from './serviceMode';

describe('serviceMode', () => {
  beforeEach(() => {
    localStorage.clear();
    clearServiceMode();
  });

  describe('persistencia del modo', () => {
    it('guarda y lee el modo elegido', () => {
      expect(readServiceMode()).toBeNull();

      saveServiceMode('delivery');

      expect(readServiceMode()).toBe('delivery');
      expect(localStorage.getItem(SERVICE_MODE_KEY)).toBe('delivery');
    });

    it('borra el modo guardado', () => {
      saveServiceMode('in_store');
      clearServiceMode();

      expect(readServiceMode()).toBeNull();
      expect(localStorage.getItem(SERVICE_MODE_KEY)).toBeNull();
    });

    it('ignora valores corruptos al leer', () => {
      localStorage.setItem(SERVICE_MODE_KEY, 'no-es-un-modo');

      expect(readServiceMode()).toBeNull();
    });

    it('valida los modos conocidos', () => {
      expect(isValidServiceMode('in_store')).toBe(true);
      expect(isValidServiceMode('delivery')).toBe(true);
      expect(isValidServiceMode('otra-cosa')).toBe(false);
      expect(isValidServiceMode(null)).toBe(false);
    });
  });

  describe('resolución de la sesión', () => {
    it('arranca sin resolver y se resuelve al elegir', () => {
      expect(isServiceModeSessionResolved()).toBe(false);

      saveServiceMode('delivery');

      expect(isServiceModeSessionResolved()).toBe(true);
    });

    it('vuelve a quedar sin resolver al borrar el modo', () => {
      saveServiceMode('in_store');
      clearServiceMode();

      expect(isServiceModeSessionResolved()).toBe(false);
    });

    it('se resuelve aunque localStorage falle (modo privado, cuota)', () => {
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new DOMException('cuota', 'QuotaExceededError');
        });

      try {
        expect(() => saveServiceMode('delivery')).not.toThrow();
        expect(isServiceModeSessionResolved()).toBe(true);
      } finally {
        setItemSpy.mockRestore();
      }
    });

    it('borra la resolución aunque localStorage falle', () => {
      saveServiceMode('delivery');

      const removeItemSpy = vi
        .spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          throw new DOMException('cuota', 'QuotaExceededError');
        });

      try {
        expect(() => clearServiceMode()).not.toThrow();
        expect(isServiceModeSessionResolved()).toBe(false);
      } finally {
        removeItemSpy.mockRestore();
      }
    });
  });

  describe('suscripción a cambios', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('notifica al guardar y al borrar', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToServiceMode(listener);
      expect(listener).not.toHaveBeenCalled();

      saveServiceMode('delivery');
      expect(listener).toHaveBeenCalledTimes(1);

      clearServiceMode();
      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
    });

    it('deja de notificar tras darse de baja', () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToServiceMode(listener);

      unsubscribe();
      saveServiceMode('delivery');

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
