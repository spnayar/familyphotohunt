export type ContestDeletionSummary = {
  contestId: string;
  location: string;
  photoCount: number;
  submittedPhotoCount: number;
  voteCount: number;
  participantCount: number;
  categoryCount: number;
  hasUploadedPhotos: boolean;
};

export async function fetchContestDeletionSummary(
  contestId: string
): Promise<ContestDeletionSummary> {
  const response = await fetch(`/api/contests/${contestId}/deletion-summary`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Failed to load contest details');
  }
  return response.json();
}
