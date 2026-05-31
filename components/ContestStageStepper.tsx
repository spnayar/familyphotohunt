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
    <div className="w-full overflow-x-auto">
      <div
        className="mx-auto min-w-[560px] max-w-3xl px-2 py-2"
        role="group"
        aria-label="Contest stage"
      >
        {/* Numbered progress track */}
        <div className="flex items-center">
          {CONTEST_STAGES.map((stage, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isLast = index === CONTEST_STAGES.length - 1;

            return (
              <div key={`num-${stage.value}`} className="flex flex-1 items-center">
                {index > 0 && (
                  <div
                    className={`h-0 flex-1 border-t-2 border-dotted ${
                      isComplete ? 'border-blue-400' : 'border-gray-300'
                    }`}
                    aria-hidden
                  />
                )}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold shadow-sm ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-500 text-white shadow-blue-200'
                      : isComplete
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-500'
                  }`}
                >
                  {isComplete ? (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`h-0 flex-1 border-t-2 border-dotted ${
                      index < currentIndex ? 'border-blue-400' : 'border-gray-300'
                    }`}
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Stage icons and labels */}
        <div className="mt-1 flex">
          {CONTEST_STAGES.map((stage, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const Icon = STAGE_ICONS[stage.value];

            return (
              <div key={stage.value} className="flex flex-1 flex-col items-center px-1">
                <div
                  className={`my-1 h-5 w-0 border-l-2 border-dotted ${
                    isComplete || isCurrent ? 'border-blue-400' : 'border-gray-300'
                  }`}
                  aria-hidden
                />

                <button
                  type="button"
                  onClick={() => onStageSelect(stage.value)}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`${stage.label}${isCurrent ? ' (current)' : ''}`}
                  title={stage.description}
                  className={`group flex flex-col items-center touch-manipulation transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    isCurrent ? 'scale-105' : 'hover:scale-105'
                  }`}
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center transition-all sm:h-[4.5rem] sm:w-[4.5rem] ${
                      isCurrent
                        ? 'rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/40 ring-4 ring-blue-100'
                        : isComplete
                          ? 'rounded-full border-2 border-blue-300 bg-blue-50 text-blue-600 shadow-sm group-hover:border-blue-400 group-hover:shadow-md'
                          : 'rounded-full border-2 border-gray-200 bg-white text-gray-400 shadow-sm group-hover:border-gray-300 group-hover:text-gray-600 group-hover:shadow-md'
                    }`}
                  >
                    <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>

                  <span
                    className={`mt-2 max-w-[5.5rem] text-center text-xs font-semibold leading-tight sm:text-sm ${
                      isCurrent
                        ? 'text-blue-700'
                        : isComplete
                          ? 'text-blue-600'
                          : 'text-gray-500 group-hover:text-gray-700'
                    }`}
                  >
                    {stage.shortLabel}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
