import { compressImage } from '../utils/imageCompressor';

export interface UploadImageOptions {
  cloudName?: string;
  uploadPreset?: string;
  compress?: boolean;
}

export interface CloudinaryUploadResponse {
  secure_url?: string;
  url?: string;
  error?: {
    message?: string;
  };
}

/**
 * Sube una imagen a Cloudinary usando Unsigned Upload Preset.
 * Comprime la imagen en el cliente antes de la subida por defecto.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  options?: UploadImageOptions
): Promise<string> {
  const cloudName =
    options?.cloudName || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset =
    options?.uploadPreset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Configuración de Cloudinary incompleta.');
  }

  let blobToUpload: Blob = file;

  // Intentar compresión previa a la subida salvo que se desactive explícitamente
  if (options?.compress !== false) {
    try {
      const compressed = await compressImage(file);
      blobToUpload = compressed.blob;
    } catch {
      // Si la compresión falla (ej. ambiente de prueba sin Canvas), usar archivo original
      blobToUpload = file;
    }
  }

  const formData = new FormData();
  formData.append('file', blobToUpload);
  formData.append('upload_preset', uploadPreset);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const data: CloudinaryUploadResponse = await response.json();

    if (!response.ok || data.error) {
      throw new Error(
        data.error?.message || `Error en la subida a Cloudinary (${response.status})`
      );
    }

    const uploadedUrl = data.secure_url || data.url;
    if (!uploadedUrl) {
      throw new Error('Respuesta inválida de Cloudinary: falta URL de la imagen.');
    }

    return uploadedUrl;
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Error desconocido al subir imagen a Cloudinary.');
  }
}
