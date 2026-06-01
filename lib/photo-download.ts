export function sanitizeDownloadFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').slice(0, 80) || 'file';
}

export function buildPhotoDownloadFilename(
  categoryName: string,
  participantName: string,
  fileName?: string
): string {
  const extension = fileName?.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.'))
    : '.jpg';
  const category = sanitizeDownloadFilename(categoryName);
  const participant = sanitizeDownloadFilename(participantName);
  return `${category}_${participant}${extension}`;
}

export function buildPhotoDownloadItem(
  contestId: string,
  photo: { id: string; fileName: string },
  categoryName: string,
  participantName: string
) {
  return {
    downloadUrl: getContestPhotosDownloadUrl(contestId, { photoId: photo.id }),
    filename: buildPhotoDownloadFilename(categoryName, participantName, photo.fileName),
  };
}

export function getContestPhotosDownloadUrl(
  contestId: string,
  options?: { scope?: 'all' | 'winners'; photoId?: string }
): string {
  const params = new URLSearchParams();
  if (options?.photoId) {
    params.set('photoId', options.photoId);
  } else if (options?.scope && options.scope !== 'all') {
    params.set('scope', options.scope);
  }
  const query = params.toString();
  return `/api/contests/${contestId}/photos/download${query ? `?${query}` : ''}`;
}
