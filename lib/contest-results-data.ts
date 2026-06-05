import { getContestResultsData } from '@/lib/store';
import { countVotesByPhotoId, getTopVotedPhotoIds, sortPhotosByVoteCount } from '@/lib/vote-results';
import { Contest, Photo } from '@/types';

export type CategoryWinner = {
  photoId: string;
  votes: number;
  participantName: string;
};

export type ContestResultsData = {
  results: Record<string, CategoryWinner[]>;
  categoryPhotos: Record<string, Photo[]>;
  voteCounts: Record<string, Record<string, number>>;
};

function toPhotoMetadata(photo: Omit<Photo, 'url'>): Photo {
  return {
    ...photo,
    url: '',
  };
}

export async function loadContestResults(contest: Contest): Promise<ContestResultsData> {
  const { photos, votes } = await getContestResultsData(contest.id);

  const photosByCategory = new Map<string, Photo[]>();
  for (const category of contest.categories) {
    photosByCategory.set(category.id, []);
  }

  for (const photo of photos) {
    const list = photosByCategory.get(photo.categoryId);
    if (list) {
      list.push(toPhotoMetadata(photo));
    }
  }

  const votesByCategory = new Map<string, Array<{ photoId: string }>>();
  for (const vote of votes) {
    const list = votesByCategory.get(vote.categoryId) ?? [];
    list.push({ photoId: vote.photoId });
    votesByCategory.set(vote.categoryId, list);
  }

  const results: Record<string, CategoryWinner[]> = {};
  const categoryPhotos: Record<string, Photo[]> = {};
  const voteCounts: Record<string, Record<string, number>> = {};

  for (const category of contest.categories) {
    const voteCountsForCategory = countVotesByPhotoId(votesByCategory.get(category.id) ?? []);
    const { photoIds: winningPhotoIds, maxVotes } = getTopVotedPhotoIds(voteCountsForCategory);

    voteCounts[category.id] = voteCountsForCategory;

    const sortedPhotos = sortPhotosByVoteCount(
      photosByCategory.get(category.id) ?? [],
      voteCountsForCategory
    );
    categoryPhotos[category.id] = sortedPhotos;

    results[category.id] = winningPhotoIds
      .map((photoId) => {
        const photo = sortedPhotos.find((p) => p.id === photoId);
        if (!photo) return null;
        const participant = contest.participants.find((p) => p.id === photo.participantId);
        return {
          photoId,
          votes: maxVotes,
          participantName: participant?.name || 'Unknown',
        };
      })
      .filter((winner): winner is CategoryWinner => winner !== null);
  }

  return { results, categoryPhotos, voteCounts };
}
