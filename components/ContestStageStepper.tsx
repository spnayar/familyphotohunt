'use client';

import {
  CONTEST_STAGES,
  type ContestStatus,
  normalizeContestStatus,
} from '@/lib/contest-status';

function SetupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path strokeLinecap="round" d="M9 12h6M9 16h4" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function VoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l2.4 4.86L20 7.77l-3.8 3.7.9 5.24L12 14.9l-5.1 2.81.9-5.24L4 7.77l5.6-.91L12 2z" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" />
      <path strokeLinecap="round" d="M5 5H3v2a3 3 0 003 3M19 5h2v2a3 3 0 01-3 3" />
    </svg>
  );
}

const STAGE_ICONS: Record<ContestStatus, typeof SetupIcon> = {
  setup: SetupIcon,
  collection: CameraIcon,
  voting: VoteIcon,
  results: TrophyIcon,
};

interface ContestStageStepperProps {
  currentStatus: string;
  onStageSelect: (status: ContestStatus) => void;
}

export function ContestStageStepper({
  currentStatus,
  onStageSelect,
}: ContestStageStepperProps) {
  const current = normalizeContestStatus(currentStatus);
  const currentIndex = CONTEST_STAGES.findIndex((s) => s.value === current);

  return (
    <div className="w-full" role="group" aria-label="Contest stage">
      <p className="mb-3 text-xs text-gray-500 sm:hidden">
        Tap a stage to set where the contest is. Current stage is highlighted.
      </p>

      <ol className="flex flex-col gap-0">
        {CONTEST_STAGES.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === CONTEST_STAGES.length - 1;
          const Icon = STAGE_ICONS[stage.value];

          return (
            <li key={stage.value} className="relative">
              {!isLast && (
                <div
                  className={`absolute left-[1.375rem] top-[3.25rem] bottom-0 w-0.5 ${
                    isComplete ? 'bg-blue-300' : 'bg-gray-200'
                  }`}
                  aria-hidden
                />
              )}

              <button
                type="button"
                onClick={() => onStageSelect(stage.value)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Set contest to ${stage.label}${isCurrent ? ' (current stage)' : ''}`}
                title={stage.description}
                className={`group relative flex w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-left transition-all touch-manipulation min-h-[56px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.99] ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                    : isComplete
                      ? 'border-blue-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                } ${index > 0 ? 'mt-2' : ''}`}
              >
                <div
                  className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${
                    isCurrent
                      ? 'border-blue-500 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm'
                      : isComplete
                        ? 'border-blue-400 bg-blue-100 text-blue-700'
                        : 'border-gray-300 bg-gray-50 text-gray-400 group-hover:border-gray-400 group-hover:text-gray-600'
                  }`}
                >
                  {isComplete && !isCurrent ? (
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-semibold sm:text-base ${
                        isCurrent ? 'text-blue-900' : isComplete ? 'text-blue-800' : 'text-gray-800'
                      }`}
                    >
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 sm:text-sm">
                    {stage.description}
                  </p>
                </div>

                <div
                  className={`shrink-0 text-xs font-medium ${
                    isCurrent ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                  aria-hidden
                >
                  {isCurrent ? (
                    <span className="hidden sm:inline">Active</span>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
