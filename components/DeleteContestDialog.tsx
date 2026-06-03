'use client';

import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  ContestDeletionSummary,
  fetchContestDeletionSummary,
} from '@/lib/contest-deletion';

type DeleteContestDialogProps = {
  open: boolean;
  contestId: string | null;
  contestLocation: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
};

export function DeleteContestDialog({
  open,
  contestId,
  contestLocation,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteContestDialogProps) {
  const [summary, setSummary] = useState<ContestDeletionSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!open || !contestId) {
      setSummary(null);
      setSummaryError('');
      setConfirmText('');
      return;
    }

    let cancelled = false;
    setIsLoadingSummary(true);
    setSummaryError('');

    void fetchContestDeletionSummary(contestId)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSummaryError(error instanceof Error ? error.message : 'Failed to load contest details');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSummary(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, contestId]);

  if (!open || !contestId) return null;

  const requiresTypedConfirmation = summary?.hasUploadedPhotos ?? false;
  const confirmationMatches =
    !requiresTypedConfirmation ||
    confirmText.trim().toLowerCase() === contestLocation.trim().toLowerCase();
  const canDelete = !isLoadingSummary && !summaryError && summary && confirmationMatches && !isDeleting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-contest-title"
      >
        <div className="border-b border-red-200 bg-red-50 px-5 py-4 rounded-t-xl">
          <h2 id="delete-contest-title" className="text-xl font-bold text-red-900">
            Delete this contest permanently?
          </h2>
          <p className="mt-1 text-sm text-red-800">
            {contestLocation} — this action cannot be undone.
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {isLoadingSummary ? (
            <div className="flex items-center gap-3 text-gray-600 py-6 justify-center">
              <LoadingSpinner />
              Loading contest details...
            </div>
          ) : summaryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {summaryError}
            </div>
          ) : summary ? (
            <>
              {summary.hasUploadedPhotos && (
                <div className="rounded-lg border-2 border-red-400 bg-red-100 px-4 py-4">
                  <p className="font-bold text-red-900 text-base">
                    Warning: uploaded photos will be permanently deleted
                  </p>
                  <p className="mt-2 text-sm text-red-900">
                    This contest has{' '}
                    <strong>
                      {summary.photoCount} uploaded photo{summary.photoCount === 1 ? '' : 's'}
                    </strong>
                    {summary.submittedPhotoCount > 0 && (
                      <>
                        {' '}
                        ({summary.submittedPhotoCount} submitted for voting)
                      </>
                    )}
                    . All images are stored only in this contest and will be lost forever if you
                    delete it.
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Everything below will be permanently removed:
                </p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>The contest and its join code</li>
                  <li>{summary.categoryCount} categor{summary.categoryCount === 1 ? 'y' : 'ies'}</li>
                  <li>{summary.participantCount} participant{summary.participantCount === 1 ? '' : 's'}</li>
                  <li>
                    {summary.photoCount} photo{summary.photoCount === 1 ? '' : 's'}
                    {summary.photoCount > 0 ? ' (including all uploads)' : ''}
                  </li>
                  <li>{summary.voteCount} vote{summary.voteCount === 1 ? '' : 's'}</li>
                </ul>
              </div>

              {requiresTypedConfirmation && (
                <div>
                  <label
                    htmlFor="delete-contest-confirm"
                    className="block text-sm font-semibold text-gray-900 mb-2"
                  >
                    Type the contest name to confirm:{' '}
                    <span className="font-bold text-red-700">{contestLocation}</span>
                  </label>
                  <input
                    id="delete-contest-confirm"
                    type="text"
                    value={confirmText}
                    onChange={(event) => setConfirmText(event.target.value)}
                    placeholder={contestLocation}
                    className="w-full px-4 py-3 border-2 border-red-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    autoComplete="off"
                    disabled={isDeleting}
                  />
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-3 rounded-lg border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={!canDelete}
            className="px-5 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isDeleting ? 'Deleting...' : 'Delete contest forever'}
          </button>
        </div>
      </div>
    </div>
  );
}
