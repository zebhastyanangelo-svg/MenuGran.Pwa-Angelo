import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadToCloudinary } from './cloudinary';

describe('cloudinary service', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('debe lanzar error si no hay cloudName ni uploadPreset configurados', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    await expect(
      uploadToCloudinary(file, { cloudName: '', uploadPreset: '' })
    ).rejects.toThrow('Configuración de Cloudinary incompleta.');
  });

  it('debe subir la imagen exitosamente y devolver la URL segura', async () => {
    const mockFile = new File(['image-data'], 'food.jpg', { type: 'image/jpeg' });
    const mockSecureUrl = 'https://res.cloudinary.com/demo/image/upload/v123/food.jpg';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ secure_url: mockSecureUrl }),
    } as Response);

    const result = await uploadToCloudinary(mockFile, {
      cloudName: 'test-cloud',
      uploadPreset: 'test-preset',
      compress: false, // Omit compression in unit test
    });

    expect(result).toBe(mockSecureUrl);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/upload');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);

    const formData = options.body as FormData;
    expect(formData.get('upload_preset')).toBe('test-preset');
    expect(formData.get('file')).toBeDefined();
  });

  it('debe manejar errores devueltos por la API de Cloudinary', async () => {
    const mockFile = new File(['image-data'], 'food.jpg', { type: 'image/jpeg' });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid upload preset' } }),
    } as Response);

    await expect(
      uploadToCloudinary(mockFile, {
        cloudName: 'test-cloud',
        uploadPreset: 'invalid-preset',
        compress: false,
      })
    ).rejects.toThrow('Invalid upload preset');
  });
});
