import { supabase } from '../lib/supabase';
import { safeFileName } from './validation';
import avatarPath from '../assets/avatar.png'; 


export const FALLBACK_AVATAR: string = avatarPath;

export const BUCKET_CLIENTS = 'clients_avatar';

export const extractStoragePath = (urlOrPath: string, bucketName = BUCKET_CLIENTS) => {
  if (!urlOrPath) return '';
  if (!urlOrPath.startsWith('http')) return urlOrPath;
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx !== -1) return urlOrPath.slice(idx + marker.length);
  const parts = urlOrPath.split(`/${bucketName}/`);
  return parts.length > 1 ? parts[1] : '';
};

export const getSignedUrl = async (path: string, expiresInSec = 60 * 60 * 24) => {
  const { data, error } = await supabase.storage.from(BUCKET_CLIENTS).createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data?.signedUrl as string;
};

/** Resolve a URL final da imagem do cliente */
export const resolveClientImageUrl = async (foto_url?: string | null) => {
  if (!foto_url) return FALLBACK_AVATAR;
  try {
    if (foto_url.startsWith('http')) return foto_url;
    const signed = await getSignedUrl(foto_url);
    return signed || FALLBACK_AVATAR;
  } catch {
    return FALLBACK_AVATAR;
  }
};

export const uploadClientImage = async (userId: string, localFile: File, prefix?: string) => {
  const safe = safeFileName(localFile.name);
  const filePath = `${prefix || userId}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from(BUCKET_CLIENTS).upload(filePath, localFile, { upsert: true });
  if (error) throw error;
  return { path: filePath };
};

/** Remove arquivo do storage */
export const removeFile = async (path: string) => {
  if (!path) return;
  await supabase.storage.from(BUCKET_CLIENTS).remove([path]);
};