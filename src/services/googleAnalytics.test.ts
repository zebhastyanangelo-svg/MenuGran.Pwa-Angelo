import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enableGoogleAnalytics,
  getGaMeasurementId,
  grantAnalyticsConsent,
  isGtagLoaded,
  trackPageView,
} from './googleAnalytics';
import { COOKIE_CONSENT_STORAGE_KEY } from '../utils/cookieConsent';

const MEASUREMENT_ID = 'G-TEST1234';

function setConsent(value: 'all' | 'necessary'): void {
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
}

function getDataLayerCalls(): unknown[][] {
  return (window.dataLayer ?? []) as unknown[][];
}

describe('googleAnalytics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.getElementById('ga4-gtag-script')?.remove();
    window.dataLayer = [];
    delete window.gtag;
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', MEASUREMENT_ID);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    document.getElementById('ga4-gtag-script')?.remove();
    window.dataLayer = [];
    delete window.gtag;
  });

  describe('getGaMeasurementId', () => {
    it('devuelve el ID configurado en el entorno', () => {
      expect(getGaMeasurementId()).toBe(MEASUREMENT_ID);
    });

    it('devuelve undefined cuando la variable está vacía', () => {
      vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
      expect(getGaMeasurementId()).toBeUndefined();
    });
  });

  describe('enableGoogleAnalytics', () => {
    it('no habilita GA4 si el usuario no acepta el consentimiento', () => {
      expect(enableGoogleAnalytics()).toBe(false);
      expect(isGtagLoaded()).toBe(false);
    });

    it('no habilita GA4 si no hay ID de medición configurado', () => {
      vi.stubEnv('VITE_GA_MEASUREMENT_ID', '');
      setConsent('all');
      expect(enableGoogleAnalytics()).toBe(false);
      expect(isGtagLoaded()).toBe(false);
    });

    it('inyecta el script y configura GA4 cuando hay consentimiento', () => {
      setConsent('all');
      expect(enableGoogleAnalytics()).toBe(true);
      expect(isGtagLoaded()).toBe(true);

      const script = document.getElementById('ga4-gtag-script');
      expect(script?.getAttribute('src')).toContain(`id=${MEASUREMENT_ID}`);

      const calls = getDataLayerCalls();
      const config = calls.find((call) => call[0] === 'config');
      expect(config).toBeDefined();
      expect(config?.[1]).toBe(MEASUREMENT_ID);
    });

    it('desactiva el page_view automático para no duplicar vistas en la SPA', () => {
      setConsent('all');
      enableGoogleAnalytics();
      const config = getDataLayerCalls().find((call) => call[0] === 'config');
      expect(config?.[2]).toMatchObject({ send_page_view: false });
    });

    it('es idempotente: una segunda llamada no vuelve a inyectar el script', () => {
      setConsent('all');
      expect(enableGoogleAnalytics()).toBe(true);
      expect(enableGoogleAnalytics()).toBe(false);
      expect(document.querySelectorAll('#ga4-gtag-script')).toHaveLength(1);
    });
  });

  describe('grantAnalyticsConsent', () => {
    it('concede solo el almacenamiento de analítica', () => {
      grantAnalyticsConsent();
      const consent = getDataLayerCalls().find((call) => call[0] === 'consent');
      expect(consent?.[1]).toBe('update');
      expect(consent?.[2]).toMatchObject({
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    });
  });

  describe('trackPageView', () => {
    it('no registra nada si el usuario no acepta el consentimiento', () => {
      setConsent('necessary');
      trackPageView('/marketplace');
      expect(getDataLayerCalls().some((call) => call[0] === 'event')).toBe(false);
    });

    it('no registra nada si el script todavía no está cargado', () => {
      setConsent('all');
      trackPageView('/marketplace');
      expect(getDataLayerCalls().some((call) => call[0] === 'event')).toBe(false);
    });

    it('registra la vista de página cuando GA4 está activo', () => {
      setConsent('all');
      enableGoogleAnalytics();
      trackPageView('/marketplace?categoria=bebidas');

      const event = getDataLayerCalls().find((call) => call[0] === 'event');
      expect(event?.[1]).toBe('page_view');
      expect(event?.[2]).toMatchObject({
        page_path: '/marketplace?categoria=bebidas',
        send_to: MEASUREMENT_ID,
      });
    });
  });
});
