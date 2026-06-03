import coverImages from './contest-cover-images.json';

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Pick a stable nature cover image for a contest from its id. */
export function pickCoverImageForContest(contestId: string): string {
  const index = hashString(contestId) % coverImages.length;
  return coverImages[index];
}

export function getContestCoverImage(contest: {
  id: string;
  coverImageUrl?: string | null;
}): string {
  return contest.coverImageUrl || pickCoverImageForContest(contest.id);
}
