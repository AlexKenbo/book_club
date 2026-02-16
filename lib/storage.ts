import { getSupabase } from './supabaseClient';

export const STORAGE_BUCKET = 'images';

const sanitizeFileName = (name: string) => {
  const base = name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const trimmed = base.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return trimmed.length > 0 ? trimmed : 'image';
};

export const buildStoragePath = (folder: string, file: File, ownerId?: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = sanitizeFileName(file.name || 'image');
  const prefix = ownerId ? `${folder}/${ownerId}` : folder;
  return `${prefix}/${timestamp}-${safeName}`;
};

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.75;

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let { width, height } = img;
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size < 300_000) {
        resolve(file);
        return;
      }

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Canvas compression failed')); return; }
          const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
};

export const uploadPublicImage = async (path: string, file: File) => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const compressed = await compressImage(file);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, compressed, {
      cacheControl: '3600',
      upsert: true,
      contentType: compressed.type || undefined
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Failed to get public URL');
  }
  return data.publicUrl;
};

export const fileToBase64 = async (file: File): Promise<string> => {
  const compressed = await compressImage(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(compressed);
  });
};
