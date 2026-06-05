export function getPhotoImageUrl(photoId: string): string {
  return `/api/photos/${photoId}/image`;
}

export async function getImageBuffer(url: string): Promise<Buffer | null> {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    if (!base64) return null;
    return Buffer.from(base64, 'base64');
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch {
      return null;
    }
  }

  return null;
}

export function getImageContentType(fileName: string, url: string): string {
  if (url.startsWith('data:image/')) {
    const match = url.match(/^data:(image\/[^;]+);/);
    if (match) return match[1];
  }

  const ext = fileName.toLowerCase();
  if (ext.endsWith('.png')) return 'image/png';
  if (ext.endsWith('.webp')) return 'image/webp';
  if (ext.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}
