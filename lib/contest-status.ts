export type ContestStatus = 'setup' | 'collection' | 'voting' | 'results';

/** @deprecated Legacy status values stored in older databases */
const LEGACY_STATUS_MAP: Record<string, ContestStatus> = {
  draft: 'setup',
  active: 'collection',
  setup: 'setup',
  collection: 'collection',
  voting: 'voting',
  completed: 'results',
  results: 'results',
  closed: 'results',
};

export const CONTEST_STAGES: {
  value: ContestStatus;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: 'setup',
    label: 'Setup',
    shortLabel: 'Setup',
    description:
      'Configure categories. The join code will be shown when you move to Open Photo Collection.',
  },
  {
    value: 'collection',
    label: 'Open Photo Collection',
    shortLabel: 'Photo Collection',
    description:
      'Participants can upload, rank, and submit photos for each category.',
  },
  {
    value: 'voting',
    label: 'Voting',
    shortLabel: 'Voting',
    description:
      'Photo collection is closed. Participants vote for their favorite photo in each category.',
  },
  {
    value: 'results',
    label: 'Results',
    shortLabel: 'Results',
    description:
      'Voting is complete. View results and run the winner reveal presentation.',
  },
];

export function normalizeContestStatus(status: string | undefined | null): ContestStatus {
  if (!status) return 'setup';
  return LEGACY_STATUS_MAP[status] ?? 'setup';
}

export function getContestStageLabel(status: string | undefined | null): string {
  const normalized = normalizeContestStatus(status);
  return CONTEST_STAGES.find((s) => s.value === normalized)?.label ?? 'Setup';
}

export function getContestStageShortLabel(status: string | undefined | null): string {
  const normalized = normalizeContestStatus(status);
  return CONTEST_STAGES.find((s) => s.value === normalized)?.shortLabel ?? 'Setup';
}

export function canCollectPhotos(status: string | undefined | null): boolean {
  return normalizeContestStatus(status) === 'collection';
}

export function canVote(status: string | undefined | null): boolean {
  return normalizeContestStatus(status) === 'voting';
}

export function isResultsStage(status: string | undefined | null): boolean {
  return normalizeContestStatus(status) === 'results';
}

export function isSetupStage(status: string | undefined | null): boolean {
  return normalizeContestStatus(status) === 'setup';
}

/** Join code is visible and usable from Open Photo Collection onward (stage 2+) */
export function canShowJoinCode(status: string | undefined | null): boolean {
  return !isSetupStage(status);
}

export function getStatusBadgeClasses(status: string | undefined | null): string {
  switch (normalizeContestStatus(status)) {
    case 'setup':
      return 'bg-gray-200 text-gray-700';
    case 'collection':
      return 'bg-green-200 text-green-700';
    case 'voting':
      return 'bg-blue-200 text-blue-700';
    case 'results':
      return 'bg-purple-200 text-purple-700';
    default:
      return 'bg-gray-200 text-gray-700';
  }
}

export type ContestStageInfo = {
  normalized: ContestStatus;
  label: string;
  shortLabel: string;
  badgeClasses: string;
};

/** Safe stage lookup for admin lists; tolerates legacy or unexpected status values. */
export function getContestStageInfo(status: string | undefined | null): ContestStageInfo {
  try {
    const normalized = normalizeContestStatus(status);
    return {
      normalized,
      label: getContestStageLabel(status),
      shortLabel: getContestStageShortLabel(status),
      badgeClasses: getStatusBadgeClasses(status),
    };
  } catch {
    return {
      normalized: 'setup',
      label: status ? String(status) : 'Unknown',
      shortLabel: 'Unknown',
      badgeClasses: 'bg-gray-200 text-gray-700',
    };
  }
}
