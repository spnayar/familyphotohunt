function ensureImageFilename(filename: string): string {
  if (/\.(jpe?g|png|gif|webp)$/i.test(filename)) return filename;
  return `${filename}.jpg`;
}

async function fetchPhotoFile(downloadUrl: string, filename: string): Promise<File> {
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error('Could not load photo');
  }
  const blob = await response.blob();
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  return new File([blob], ensureImageFilename(filename), { type });
}

/** Save one photo — opens the share sheet on mobile so users can tap Save Image / Add to Photos. */
export async function savePhotoToDevice(downloadUrl: string, filename: string): Promise<void> {
  const file = await fetchPhotoFile(downloadUrl, filename);

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = file.name;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Save multiple photos via share sheet when supported; otherwise download each file. */
export async function savePhotosToDevice(
  items: { downloadUrl: string; filename: string }[]
): Promise<void> {
  if (items.length === 0) {
    throw new Error('No photos to save');
  }

  const files: File[] = [];
  for (const item of items) {
    files.push(await fetchPhotoFile(item.downloadUrl, item.filename));
  }

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files })) {
    await navigator.share({ files });
    return;
  }

  for (let i = 0; i < files.length; i++) {
    const objectUrl = URL.createObjectURL(files[i]);
    try {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = files[i].name;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
    if (i < files.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
}

export function isMobileSaveContext(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod|Android/i.test(ua);
}
