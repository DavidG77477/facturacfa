import { supabase } from '../lib/supabase';

const BUCKET = 'business-assets';

export type BusinessAssetKind = 'logo' | 'stamp' | 'signature';

function assetPath(userId: string, kind: BusinessAssetKind, file: File): string {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  return `${userId}/${kind}.${ext}`;
}

function publicUrlFor(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust so replaced images refresh immediately in the UI
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadBusinessAsset(
  userId: string,
  kind: BusinessAssetKind,
  file: File
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Seules les images sont acceptées (PNG, JPG, WebP, SVG…).');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("L'image est trop lourde (maximum 5 Mo).");
  }

  const path = assetPath(userId, kind, file);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  });

  if (error) throw new Error(error.message);
  return publicUrlFor(path);
}

export async function deleteBusinessAsset(
  userId: string,
  kind: BusinessAssetKind,
  currentUrl?: string
): Promise<void> {
  const candidates = new Set<string>();

  if (currentUrl) {
    try {
      const url = new URL(currentUrl);
      const marker = `/object/public/${BUCKET}/`;
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        candidates.add(decodeURIComponent(url.pathname.slice(idx + marker.length)));
      }
    } catch {
      // ignore invalid URL
    }
  }

  // Cover common extensions if the URL could not be parsed
  for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif']) {
    candidates.add(`${userId}/${kind}.${ext}`);
  }

  const { error } = await supabase.storage.from(BUCKET).remove([...candidates]);
  if (error) throw new Error(error.message);
}
