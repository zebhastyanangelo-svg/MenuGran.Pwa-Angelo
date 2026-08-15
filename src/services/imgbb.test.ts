import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadToImgBB } from './imgbb';

describe('imgbb service', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('VITE_IMGBB_API_KEY', 'd68dfbd9fb8aa2085dc2c7bebf2f6df9');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('debe lanzar error si la API key de ImgBB no está configurada', async () => {
    vi.stubEnv('VITE_IMGBB_API_KEY', '');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    await expect(uploadToImgBB(file)).rejects.toThrow(
      'La API key de ImgBB no está configurada.',
    );
  });

  it('debe subir la imagen exitosamente y devolver la URL (display_url)', async () => {
    const mockFile = new File(['image-data'], 'food.jpg', {
      type: 'image/jpeg',
    });
    const mockDisplayUrl = 'https://i.ibb.co/abc123/food.jpg';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        status: 200,
        data: { display_url: mockDisplayUrl, url: mockDisplayUrl },
      }),
    } as Response);

    const result = await uploadToImgBB(mockFile, { compress: false });

    expect(result).toBe(mockDisplayUrl);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const calls = (
      globalThis.fetch as unknown as {
        mock: { calls: [string, RequestInit][]; };
      }
    ).mock.calls;
    const [url, options] = calls[0];
    expect(url).toBe(
      'https://api.imgbb.com/1/upload?key=d68dfbd9fb8aa2085dc2c7bebf2f6df9',
    );
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);

    const formData = options.body as FormData;
    expect(formData.get('image')).toBeDefined();
  });

  it('debe devolver la URL cuando solo se expone `url` (fallback de display_url)', async () => {
    const mockFile = new File(['image-data'], 'food.jpg', {
      type: 'image/jpeg',
    });
    const mockUrl = 'https://i.ibb.co/def456/food.jpg';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        status: 200,
        data: { url: mockUrl },
      }),
    } as Response);

    const result = await uploadToImgBB(mockFile, { compress: false });
    expect(result).toBe(mockUrl);
  });

  it('debe manejar errores devueltos por la API de ImgBB', async () => {
    const mockFile = new File(['image-data'], 'food.jpg', {
      type: 'image/jpeg',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        status: 400,
        error: { message: 'Imagen demasiado grande', code: 'resize' },
      }),
    } as Response);

    await expect(
      uploadToImgBB(mockFile, { compress: false }),
    ).rejects.toThrow('Imagen demasiado grande');
  });

  it('debe manejar errores de red (fetch rechazado)', async () => {
    const mockFile = new File(['image-data'], 'food.jpg', {
      type: 'image/jpeg',
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    await expect(
      uploadToImgBB(mockFile, { compress: false }),
    ).rejects.toThrow('Error al subir la imagen a ImgBB.');
  });

  it('debe lanzar error si la respuesta no contiene una URL válida', async () => {
    const mockFile = new File(['image-data'], 'food.jpg', {
      type: 'image/jpeg',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        status: 200,
        data: {},
      }),
    } as Response);

    await expect(
      uploadToImgBB(mockFile, { compress: false }),
    ).rejects.toThrow('Respuesta inválida de ImgBB');
  });
});
