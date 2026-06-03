export type ParticipantAnnouncementStage = 'collection' | 'voting' | 'results';

export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function getContestJoinUrl(joinCode: string): string {
  return `${getAppBaseUrl()}/?code=${encodeURIComponent(joinCode.toUpperCase().trim())}`;
}

export function getContestParticipantUrl(contestId: string): string {
  return `${getAppBaseUrl()}/contest/${contestId}`;
}

export function getParticipantAnnouncement(
  stage: ParticipantAnnouncementStage,
  contest: { id: string; location: string; joinCode: string }
): string {
  const contestName = contest.location;

  switch (stage) {
    case 'collection':
      return `You have been invited to the ${contestName} Photo Hunt! Go to ${getContestJoinUrl(contest.joinCode)} and enter code ${contest.joinCode} to join in the fun`;
    case 'voting':
      return `The ${contestName} Photo Hunt submissions are complete! Go to ${getContestParticipantUrl(contest.id)} to vote for your favorites in each category`;
    case 'results':
      return `The ${contestName} Photo Hunt voting is done and the winners have been crowned! Go to ${getContestParticipantUrl(contest.id)} to see all the winning photos`;
  }
}

export function getAnnouncementCopyMeta(stage: ParticipantAnnouncementStage): {
  title: string;
  description: string;
} {
  switch (stage) {
    case 'collection':
      return {
        title: 'What to do next',
        description:
          'Copy the message below and send it to your participants by text or email so they can join and upload photos.',
      };
    case 'voting':
      return {
        title: 'What to do next',
        description:
          'Copy the message below and send it to your participants so they know photo collection is closed and can start voting.',
      };
    case 'results':
      return {
        title: 'What to do next',
        description:
          'Copy the message below and send it to your participants so they can view the winning photos.',
      };
  }
}
