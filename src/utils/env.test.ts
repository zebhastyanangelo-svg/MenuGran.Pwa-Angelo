import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnvError, getEnvVar, validateRuntimeEnv, warnIfMissing } from './env';

describe('env utility', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'test-cloud');
    vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'test-preset');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getEnvVar', () => {
    it('debe retornar el valor de una variable existente', () => {
      const result = getEnvVar('VITE_SUPABASE_URL');
      expect(result).toBe('https://test.supabase.co');
    });

    it('debe lanzar error si la variable no está definida', () => {
      vi.unstubAllEnvs();
      expect(() => getEnvVar('VITE_MISSING_VAR')).toThrow('[EnvError]');
    });

    it('debe lanzar error si la variable está vacía', () => {
      vi.stubEnv('VITE_EMPTY_VAR', '');
      expect(() => getEnvVar('VITE_EMPTY_VAR')).toThrow('[EnvError]');
    });

    it('debe retornar valor por defecto si se proporciona y la variable no existe', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
      vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', 'test-cloud');
      vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', 'test-preset');
      const result = getEnvVar('VITE_OPTIONAL', 'default-value');
      expect(result).toBe('default-value');
    });

    it('debe lanzar EnvError con nombre correcto', () => {
      vi.unstubAllEnvs();
      try {
        getEnvVar('VITE_MISSING_VAR');
        expect.fail('Debería haber lanzado error');
      } catch (e) {
        expect(e).toBeInstanceOf(EnvError);
        expect((e as Error).name).toBe('EnvError');
      }
    });
  });

  describe('warnIfMissing', () => {
    it('debe retornar true y no lanzar advertencia cuando la variable está definida', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = warnIfMissing('VITE_SUPABASE_URL');
      expect(result).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('debe retornar false y lanzar advertencia cuando la variable está ausente', () => {
      vi.unstubAllEnvs();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = warnIfMissing('VITE_MISSING_WARNING', 'feature-test');
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledOnce();
      const message = warnSpy.mock.calls[0][0] as string;
      expect(message).toContain('VITE_MISSING_WARNING');
      expect(message).toContain('feature-test');
      warnSpy.mockRestore();
    });
  });

  describe('validateRuntimeEnv', () => {
    it('debe validar y retornar todas las variables requeridas', () => {
      const result = validateRuntimeEnv();
      expect(result.supabaseUrl).toBe('https://test.supabase.co');
      expect(result.supabaseAnonKey).toBe('test-anon-key');
      expect(result.cloudinaryCloudName).toBe('test-cloud');
      expect(result.cloudinaryUploadPreset).toBe('test-preset');
    });

    it('debe lanzar error si falta VITE_SUPABASE_URL', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      expect(() => validateRuntimeEnv()).toThrow('[EnvError]');
    });

    it('debe lanzar error si falta VITE_SUPABASE_ANON_KEY', () => {
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
      expect(() => validateRuntimeEnv()).toThrow('[EnvError]');
    });

    it('debe retornar undefined para variables de Cloudinary opcionales si no están definidas', () => {
      vi.stubEnv('VITE_CLOUDINARY_CLOUD_NAME', '');
      vi.stubEnv('VITE_CLOUDINARY_UPLOAD_PRESET', '');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = validateRuntimeEnv();
      expect(result.cloudinaryCloudName).toBeUndefined();
      expect(result.cloudinaryUploadPreset).toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
