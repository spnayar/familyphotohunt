import { getPhotosByCategory, getVotesByCategory } from '@/lib/store';
import { countVotesByPhoto, getTopVotedPhotoIds, sortPhotosByVoteCount } from '@/lib/vote-results';
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

export async function loadContestResults(contest: Contest): Promise<ContestResultsData> {
  const results: Record<string, CategoryWinner[]> = {};
  const categoryPhotos: Record<string, Photo[]> = {};
  const voteCounts: Record<string, Record<string, number>> = {};

  for (const category of contest.categories) {
    const votes = await getVotesByCategory(category.id);
    const voteCountsForCategory = countVotesByPhoto(votes);
    const { photoIds: winningPhotoIds, maxVotes } = getTopVotedPhotoIds(voteCountsForCategory);

    voteCounts[category.id] = voteCountsForCategory;

    const photos = await getPhotosByCategory(category.id);
    categoryPhotos[category.id] = sortPhotosByVoteCount(
      photos.filter((p) => p.submitted),
      voteCountsForCategory
    );

    results[category.id] = winningPhotoIds
      .map((photoId) => {
        const photo = categoryPhotos[category.id].find((p) => p.id === photoId);
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
