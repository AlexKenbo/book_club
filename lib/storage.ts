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

export const uploadPublicImage = async (path: string, file: File) => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client not configured');
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || undefined
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

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
};
