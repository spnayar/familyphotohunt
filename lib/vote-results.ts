import { Vote } from '@/types';

export function countVotesByPhoto(votes: Vote[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const vote of votes) {
    counts[vote.photoId] = (counts[vote.photoId] || 0) + 1;
  }
  return counts;
}

export function getTopVotedPhotoIds(voteCounts: Record<string, number>): {
  photoIds: string[];
  maxVotes: number;
} {
  let maxVotes = 0;
  for (const count of Object.values(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
    }
  }

  if (maxVotes === 0) {
    return { photoIds: [], maxVotes: 0 };
  }

  const photoIds = Object.entries(voteCounts)
    .filter(([, count]) => count === maxVotes)
    .map(([photoId]) => photoId);

  return { photoIds, maxVotes };
}

export function sortPhotosByVoteCount<T extends { id: string }>(
  photos: T[],
  voteCounts: Record<string, number>
): T[] {
  return [...photos].sort((a, b) => {
    const voteDiff = (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0);
    return voteDiff !== 0 ? voteDiff : a.id.localeCompare(b.id);
  });
}
