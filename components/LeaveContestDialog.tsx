'use client';

import { LoadingSpinner } from '@/components/LoadingSpinner';

type LeaveContestDialogProps = {
  open: boolean;
  contestLocation: string;
  isOrganizer?: boolean;
  hasPhotos?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLeaving?: boolean;
};

export function LeaveContestDialog({
  open,
  contestLocation,
  isOrganizer = false,
  hasPhotos = false,
  onClose,
  onConfirm,
  isLeaving = false,
}: LeaveContestDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isLeaving) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="leave-contest-title"
      >
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 id="leave-contest-title" className="text-lg font-bold text-gray-900">
            Leave {contestLocation}?
          </h2>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm text-gray-700">
          <p>
            You will be removed from this contest as a participant.
            {hasPhotos ? ' Your uploaded photos and votes will also be deleted.' : ''}
          </p>
          <p>
            You can rejoin anytime with the contest join code if photo collection is still open or later
            stages allow it.
          </p>
          {isOrganizer && (
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900">
              You&apos;ll still manage this contest from the admin page — leaving only removes your
              participant entry.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isLeaving}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isLeaving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 min-h-[44px]"
          >
            {isLeaving ? (
              <>
                <LoadingSpinner size="sm" />
                Leaving...
              </>
            ) : (
              'Leave contest'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
