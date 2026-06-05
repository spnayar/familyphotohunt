'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getContest,
  getParticipantByUserId,
  deleteParticipant,
  getPhotosByParticipant,
  getContestVotingData,
  addPhoto,
  updatePhoto,
  deletePhoto,
  updateParticipant,
  hasVoted,
  getVotesByCategory,
  addVote,
  getUser,
} from '@/lib/store';
import { Contest, Participant, Photo, Category } from '@/types';
import {
  canCollectPhotos,
  canVote,
  getContestStageLabel,
  isResultsStage,
  isSetupStage,
  normalizeContestStatus,
} from '@/lib/contest-status';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { PageLoader } from '@/components/PageLoader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { VotingPhotoGallery } from '@/components/VotingPhotoGallery';
import { compressImageForUpload } from '@/lib/compress-image';
import { getPhotoImageUrl } from '@/lib/photo-image';
import { ContestResultsDisplay } from '@/components/ContestResultsDisplay';
import { useLoadingAction } from '@/lib/use-loading-action';
import { clearStoredUserId, getStoredUserId } from '@/lib/auth-session';
import { touchUserActivity } from '@/lib/user-activity';
import { LeaveContestDialog } from '@/components/LeaveContestDialog';

export default function ContestPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.id as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const { loadingMessage, isLoading, run } = useLoadingAction();
  const [userName, setUserName] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<Photo | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLeavingContest, setIsLeavingContest] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userId = getStoredUserId();
    const loadData = async () => {
      if (!userId) {
        router.push('/');
        return;
      }

      touchUserActivity(userId);

      const loadedContest = await getContest(contestId);
      if (!loadedContest) {
        router.push('/');
        return;
      }
      setContest(loadedContest);

      const loadedParticipant = await getParticipantByUserId(userId, contestId);
      if (!loadedParticipant) {
        router.push('/');
        return;
      }

      setParticipant(loadedParticipant);

      const loadedPhotos = await getPhotosByParticipant(loadedParticipant.id);
      setPhotos(loadedPhotos);
      setReadyToSubmit(loadedParticipant.submissionFinalized ?? false);
      setIsPageLoading(false);
    };
    loadData();
  }, [contestId, router]);

  // Load user info for avatar
  useEffect(() => {
    const loadUserInfo = async () => {
      const userId = getStoredUserId();
      if (userId) {
        const user = await getUser(userId);
        if (user) {
          setUserName(user.name);
        }
      }
    };
    loadUserInfo();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, categoryId: string) => {
    const file = e.target.files?.[0];
    if (!file || !participant) return;

    e.target.value = '';

    await run('Uploading photo...', async () => {
      const { dataUrl: photoUrl, fileName } = await compressImageForUpload(file);

      try {
        const newPhoto = await addPhoto({
          contestId,
          categoryId,
          participantId: participant.id,
          url: photoUrl,
          fileName,
          submitted: false,
        });
        setPhotos((prev) => [...prev, newPhoto]);
      } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Failed to upload photo. Please try again.');
      }
    });
  };

  const movePhotoInCategory = async (categoryId: string, photoId: string, direction: 'up' | 'down') => {
    if (!participant) return;

    await run('Updating photo order...', async () => {
      const categoryPhotos = getDraftPhotosForCategory(categoryId);
      const currentIndex = categoryPhotos.findIndex((p) => p.id === photoId);

      if (currentIndex === -1) return;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= categoryPhotos.length) return;

      const photosToUpdate = [...categoryPhotos];
      const [movedPhoto] = photosToUpdate.splice(currentIndex, 1);
      photosToUpdate.splice(targetIndex, 0, movedPhoto);

      const newRanks = photosToUpdate.map((photo, index) => ({
        id: photo.id,
        rank: index + 1,
      }));

      for (const { id, rank } of newRanks) {
        await updatePhoto(id, { rank });
      }

      const updatedPhotos = await getPhotosByParticipant(participant.id);
      setPhotos(updatedPhotos);
    });
  };

  const handleReadyToSubmitToggle = async (checked: boolean) => {
    if (!contest || !participant) return;

    if (checked) {
      const emptyCategories = contest.categories.filter((category) => {
        const categoryPhotos = photos.filter(
          (p) => p.categoryId === category.id && !p.submitted
        );
        return categoryPhotos.length === 0;
      });

      if (emptyCategories.length > 0) {
        const categoryList = emptyCategories.map((c) => `• ${c.name}`).join('\n');
        const confirmed = confirm(
          `You don't have a photo in every category:\n\n${categoryList}\n\nSubmit anyway? You won't be able to add photos until you turn off "Ready to Submit".\n\nClick OK to submit, or Cancel to go back and add photos.`
        );
        if (!confirmed) return;
      }
    }

    await run(checked ? 'Submitting photos...' : 'Updating submission...', async () => {
      if (checked) {
        for (const category of contest.categories) {
          const categoryPhotos = photos.filter(
            (p) => p.categoryId === category.id && !p.submitted
          );
          const topPhoto = categoryPhotos.find((p) => p.rank === 1) || categoryPhotos[0];

          if (topPhoto) {
            await updatePhoto(topPhoto.id, { submitted: true });

            for (const photo of categoryPhotos) {
              if (photo.id !== topPhoto.id) {
                await updatePhoto(photo.id, { submitted: false });
              }
            }
          }
        }
      } else {
        const submittedPhotos = photos.filter((p) => p.submitted);
        for (const photo of submittedPhotos) {
          await updatePhoto(photo.id, { submitted: false });
        }
      }

      const updatedParticipant = await updateParticipant(participant.id, {
        submissionFinalized: checked,
      });
      setParticipant(updatedParticipant);

      const updatedPhotos = await getPhotosByParticipant(participant.id);
      setPhotos(updatedPhotos);
      setReadyToSubmit(checked);
    });
  };

  const getSubmittedPhotoForCategory = (categoryId: string): Photo | undefined => {
    return photos.find(p => p.categoryId === categoryId && p.submitted);
  };

  const getDraftPhotosForCategory = (categoryId: string): Photo[] => {
    return photos.filter(p => p.categoryId === categoryId && !p.submitted).sort((a, b) => (a.rank || 999) - (b.rank || 999));
  };

  const isSetup = isSetupStage(contest?.status);
  const isCollection = canCollectPhotos(contest?.status);
  const isVotingMode = canVote(contest?.status);
  const isResults = isResultsStage(contest?.status);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    clearStoredUserId();
    router.push('/');
  };

  const isOrganizer = contest?.creatorId === getStoredUserId();

  const handleLeaveContest = async () => {
    if (!participant) return;

    setIsLeavingContest(true);
    try {
      const success = await deleteParticipant(contestId, participant.id);
      if (success) {
        setShowLeaveDialog(false);
        router.push('/');
        return;
      }
      alert('Could not leave the contest. Please try again.');
    } finally {
      setIsLeavingContest(false);
    }
  };

  const leaveDialog = (
    <LeaveContestDialog
      open={showLeaveDialog}
      contestLocation={contest?.location ?? 'this contest'}
      isOrganizer={isOrganizer}
      hasPhotos={photos.length > 0}
      onClose={() => {
        if (!isLeavingContest) setShowLeaveDialog(false);
      }}
      onConfirm={handleLeaveContest}
      isLeaving={isLeavingContest}
    />
  );

  const UserAvatar = () => (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {userName ? getInitials(userName) : 'U'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {userName || 'User'}
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-0"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">{userName || 'User'}</p>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Back to Home
                </button>
                <Link
                  href="/help/participants"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  Help guide
                </Link>
                {isOrganizer && (
                  <Link
                    href={`/admin/contest/${contestId}`}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Admin page
                  </Link>
                )}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowLeaveDialog(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-200"
                >
                  Leave contest
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-200"
                >
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (isPageLoading || !contest || !participant) {
    return <PageLoader message="Loading contest..." />;
  }

  if (isVotingMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserAvatar />
        <VotingView contest={contest} participant={participant} />
        {leaveDialog}
      </div>
    );
  }

  if (isResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserAvatar />
        <ContestResultsView contest={contest} participant={participant} />
        {leaveDialog}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <LoadingOverlay show={isLoading} message={loadingMessage ?? undefined} />
      <UserAvatar />
      {leaveDialog}

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{contest.location}</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Welcome, {participant.name}!
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Categories</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {isSetup
                ? isOrganizer
                  ? 'This contest is still being set up. Finish categories on the admin page, then move to Open Photo Collection when you\'re ready for uploads.'
                  : 'The organizer is preparing this contest. Photo uploads will open when the contest moves to Open Photo Collection.'
                : 'Upload photos for each category, rank them with the arrows, then toggle "Ready to Submit" when done. You can submit even if some categories have no photo — you\'ll be asked to confirm first.'}
            </p>

            {isSetup && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800 text-center font-medium mb-1">
                  Contest stage: {getContestStageLabel(contest.status)}
                </p>
                {isOrganizer ? (
                  <p className="text-sm text-yellow-800 text-center">
                    You&apos;re already in this contest as a participant — no join code needed.{' '}
                    <Link href={`/admin/contest/${contestId}`} className="font-semibold underline">
                      Go to admin page
                    </Link>{' '}
                    to finish setup.
                  </p>
                ) : (
                  <p className="text-sm text-yellow-800 text-center">
                    Check back when photo collection opens.
                  </p>
                )}
              </div>
            )}
            
            {/* Ready to Submit Toggle */}
            {isCollection && (
            <div className="bg-white rounded-lg shadow-md p-4 mb-6 border-2 border-gray-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-base sm:text-lg font-semibold text-gray-900 block mb-1">
                    Ready to Submit
                  </label>
                  <p className="text-sm text-gray-600">
                    {readyToSubmit
                      ? 'Your submission is locked. Turn off this toggle to add or change photos (while photo collection is open).'
                      : 'Toggle on when you\'re ready. Your top-ranked photo in each category will be submitted. Missing categories are allowed with a warning.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReadyToSubmitToggle(!readyToSubmit)}
                  disabled={isLoading}
                  className={`relative inline-flex items-center cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-full ml-4 disabled:opacity-50`}
                  role="switch"
                  aria-checked={readyToSubmit}
                >
                  <div className={`w-16 h-9 rounded-full transition-colors duration-200 ${
                    readyToSubmit ? 'bg-green-600' : 'bg-gray-300'
                  }`}>
                    <div className={`w-7 h-7 bg-white rounded-full shadow-md transform transition-transform duration-200 mt-1 ${
                      readyToSubmit ? 'translate-x-8' : 'translate-x-1'
                    }`}></div>
                  </div>
                </button>
              </div>
            </div>
            )}
          </div>

          <div className="space-y-6 sm:space-y-8">
            {contest.categories.map((category) => {
              const submittedPhoto = getSubmittedPhotoForCategory(category.id);
              const draftPhotos = getDraftPhotosForCategory(category.id);
              const hasSubmittedPhoto = !!submittedPhoto;
              const hasDraftPhotos = draftPhotos.length > 0;
              const canReorderPhotos = draftPhotos.length > 1;
              const isLocked = readyToSubmit;
              const showMissingHint =
                isCollection && !isLocked && !hasSubmittedPhoto && !hasDraftPhotos;

              return (
                <div 
                  key={category.id} 
                  className={`bg-white rounded-lg shadow-lg p-6 sm:p-8 ${
                    showMissingHint ? 'border-2 border-amber-300 bg-amber-50/40' : ''
                  }`}
                >
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">{category.name}</h2>
                      {showMissingHint && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs sm:text-sm font-semibold">
                          No photos yet
                        </span>
                      )}
                      {isLocked && hasSubmittedPhoto && (
                        <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs sm:text-sm font-semibold">
                          ✓ Submitted
                        </span>
                      )}
                      {isLocked && !hasSubmittedPhoto && (
                        <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs sm:text-sm font-semibold">
                          Skipped
                        </span>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm sm:text-base text-gray-700 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                        {category.description}
                      </p>
                    )}
                  </div>
                  
                  {isLocked && hasSubmittedPhoto ? (
                    <div className="mb-4">
                      <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
                        ✓ Submitted
                      </div>
                      <div className="relative w-full max-w-md">
                        <img
                          src={submittedPhoto.url}
                          alt={`Submitted for ${category.name}`}
                          className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedPhotoForView(submittedPhoto)}
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        Turn off &quot;Ready to Submit&quot; above to change this photo.
                      </p>
                    </div>
                  ) : isLocked && !hasSubmittedPhoto ? (
                    <div className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-lg">
                      <p className="text-sm text-gray-700 font-medium">No photo submitted for this category.</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Turn off &quot;Ready to Submit&quot; above to add a photo while collection is open.
                      </p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium mb-4">
                        Not Yet Submitted
                      </div>
                      
                      {/* Upload Section */}
                      {!isCollection ? (
                        <div className="mb-6 p-4 bg-gray-100 border-2 border-gray-300 rounded-lg">
                          <p className="text-sm text-gray-600 text-center">
                            {isSetup
                              ? 'Photo collection has not started yet.'
                              : 'Photo collection is closed for this contest.'}
                          </p>
                        </div>
                      ) : (
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Photos
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(e, category.id)}
                            disabled={isLoading}
                            className="hidden"
                            id={`photo-input-${category.id}`}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`photo-input-${category.id}`)?.click()}
                            disabled={isLoading}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-base touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isLoading ? (
                              <>
                                <LoadingSpinner size="sm" className="border-white border-t-transparent" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <span className="text-xl">📷</span>
                                <span>Take or Choose Photo</span>
                              </>
                            )}
                          </button>
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            Tap the button above to take a new photo with your camera or choose from your photo library
                          </p>
                        </div>
                      )}

                      {showMissingHint && (
                        <p className="text-amber-800 text-sm text-center">
                          Optional — you can still submit without a photo in this category.
                        </p>
                      )}
                    </div>
                  )}

                  {!isLocked && hasDraftPhotos && (
                    <div className="mb-6">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                        Your Photos{' '}
                        {isCollection && canReorderPhotos
                          ? '- Rank with arrows (top photo will be submitted)'
                          : isCollection
                            ? '- Top photo will be submitted'
                            : ''}
                      </h3>
                      {isCollection && canReorderPhotos && (
                        <p className="text-sm text-gray-600 mb-4">
                          Use the move up and move down buttons to reorder photos. The photo at the top will be submitted when you toggle &quot;Ready to Submit&quot;.
                        </p>
                      )}
                      {!isCollection && (
                        <p className="text-sm text-gray-600 mb-4">
                          Photo collection is not open. You can view your existing photos below.
                        </p>
                      )}
                      <div className="space-y-3">
                        {draftPhotos.map((photo, index) => {
                          const isTopRanked = photo.rank === 1 || index === 0;
                          return (
                            <div
                              key={photo.id}
                              className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                                isTopRanked && isCollection
                                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 shadow-lg'
                                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="relative w-full sm:w-40 h-56 sm:h-40 flex-shrink-0">
                                <img
                                  src={photo.url}
                                  alt={`Photo ${index + 1}`}
                                  className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setSelectedPhotoForView(photo)}
                                />
                              </div>
                              {!isCollection ? (
                                <div className="flex-1 w-full sm:w-auto">
                                  <p className="text-sm text-gray-600">
                                    Rank: {photo.rank || index + 1}
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 w-full sm:w-auto">
                                    <p className="text-sm font-medium text-gray-700 mb-1">
                                      Rank: {photo.rank || index + 1}
                                    </p>
                                    {isTopRanked && (
                                      <p className="text-xs text-green-700 font-semibold">
                                        This is your current top selection
                                      </p>
                                    )}
                                    {canReorderPhotos && (
                                      <>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Use the arrows to reorder
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                          <button
                                            type="button"
                                            disabled={index === 0 || isLoading}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void movePhotoInCategory(category.id, photo.id, 'up');
                                            }}
                                            className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-xs sm:text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                                          >
                                            ↑ Move Up
                                          </button>
                                          <button
                                            type="button"
                                            disabled={index === draftPhotos.length - 1 || isLoading}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void movePhotoInCategory(category.id, photo.id, 'down');
                                            }}
                                            className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-xs sm:text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
                                          >
                                            ↓ Move Down
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Delete this photo?')) {
                                        void run('Deleting photo...', async () => {
                                          await deletePhoto(photo.id);
                                          if (participant) {
                                            const updatedPhotos = await getPhotosByParticipant(participant.id);
                                            setPhotos(updatedPhotos);
                                          }
                                        });
                                      }
                                    }}
                                    disabled={isLoading}
                                    className="w-full sm:w-auto text-red-600 hover:text-red-800 active:text-red-900 px-4 py-2 rounded-lg border border-red-300 hover:bg-red-50 touch-manipulation min-h-[44px] text-sm sm:text-base font-medium disabled:opacity-50"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {selectedPhotoForView && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoForView(null)}
        >
          <div className="relative max-w-7xl max-h-[95vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setSelectedPhotoForView(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-bold w-12 h-12 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-10 transition-colors z-10"
              aria-label="Close modal"
            >
              ×
            </button>
            <img
              src={selectedPhotoForView.url}
              alt="Full size photo"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ContestResultsView({ contest, participant }: { contest: Contest; participant: Participant }) {
  return (
    <ContestResultsDisplay
      contest={contest}
      contestId={contest.id}
      subtitle={`${contest.location} — ${participant.name}`}
    />
  );
}

function shufflePhotos<T>(photos: T[]): T[] {
  const shuffled = [...photos];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function VotingView({ contest, participant }: { contest: Contest; participant: Participant }) {
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string | undefined>>({});
  const [photosByCategory, setPhotosByCategory] = useState<Record<string, Photo[]>>({});
  const [galleryState, setGalleryState] = useState<{ categoryId: string; index: number } | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const { loadingMessage, isLoading, run } = useLoadingAction();

  useEffect(() => {
    const loadData = async () => {
      const { photos, votesByCategory } = await getContestVotingData(contest.id, participant.id);

      const byCategory: Record<string, Photo[]> = {};
      for (const category of contest.categories) {
        const categoryPhotos = photos.filter((photo) => photo.categoryId === category.id);
        byCategory[category.id] = shufflePhotos(
          categoryPhotos.map((photo) => ({
            ...photo,
            url: photo.url || getPhotoImageUrl(photo.id),
          }))
        );
      }

      setPhotosByCategory(byCategory);
      setSelectedVotes(votesByCategory);
      setIsPageLoading(false);
    };

    void loadData();
  }, [contest.id, contest.categories, participant.id]);

  const getPhotosForCategory = (categoryId: string): Photo[] => {
    return photosByCategory[categoryId] ?? [];
  };

  const handleVote = async (categoryId: string, photoId: string) => {
    const categoryPhotos = getPhotosForCategory(categoryId);
    const photo = categoryPhotos.find((p) => p.id === photoId);
    if (photo && photo.participantId === participant.id) {
      alert("You cannot vote for your own photo!");
      return;
    }

    await run('Saving vote...', async () => {
      setSelectedVotes({
        ...selectedVotes,
        [categoryId]: photoId,
      });

      await addVote({
        contestId: contest.id,
        categoryId,
        voterId: participant.id,
        photoId,
        rank: 1,
      });
    });
  };

  const allCategoriesVoted = contest.categories.every(
    (cat) => !!selectedVotes[cat.id]
  );

  if (isPageLoading) {
    return <PageLoader message="Loading voting..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <LoadingOverlay show={isLoading} message={loadingMessage ?? undefined} />
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Voting Time!</h1>
              <p className="text-sm sm:text-base text-gray-600">
                {contest.location} - {participant.name}
              </p>
            </div>
            <button
              onClick={() => {
                clearStoredUserId();
                window.location.href = '/login';
              }}
              className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-sm sm:text-base touch-manipulation min-h-[44px] px-2"
            >
              Logout
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-blue-800">
              <strong>All participants have submitted!</strong> Now it&apos;s time to vote.
              Pick your favorite photo in each category. Open the gallery for a full-screen view — swipe on your phone to browse. You cannot vote for your own photo.
            </p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {contest.categories.map((category) => {
              const categoryPhotos = getPhotosForCategory(category.id);
              const selectedPhotoId = selectedVotes[category.id];

              return (
                <div key={category.id} className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">{category.name}</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    {selectedPhotoId
                      ? '✓ You picked a favorite for this category. Browse the gallery or tap a thumbnail to change your vote.'
                      : 'Open the gallery to view photos full screen, or vote from the thumbnails below.'}
                  </p>

                  {categoryPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setGalleryState({ categoryId: category.id, index: 0 })}
                      className="w-full sm:w-auto mb-4 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-medium text-sm sm:text-base touch-manipulation min-h-[44px]"
                    >
                      Browse gallery ({categoryPhotos.length} photo{categoryPhotos.length !== 1 ? 's' : ''})
                    </button>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {categoryPhotos.map((photo, photoIndex) => {
                      const isMyPhoto = photo.participantId === participant.id;
                      const isSelected = selectedPhotoId === photo.id;
                      const isDisabled = isMyPhoto;

                      return (
                        <div
                          key={photo.id}
                          className={`relative border-2 rounded-lg overflow-hidden transition-all aspect-square ${
                            isSelected
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : isDisabled
                              ? 'border-gray-200 opacity-60'
                              : 'border-gray-200 active:border-gray-400'
                          }`}
                        >
                          <button
                            type="button"
                            className="absolute inset-0 z-0 w-full h-full"
                            onClick={() => setGalleryState({ categoryId: category.id, index: photoIndex })}
                            aria-label={`View photo ${photoIndex + 1} in gallery`}
                          >
                            <img
                              src={getPhotoImageUrl(photo.id)}
                              alt={`Photo for ${category.name}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </button>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 z-10 bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-xs pointer-events-none">
                              ✓
                            </div>
                          )}
                          {isMyPhoto && (
                            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gray-800/75 text-white text-[10px] sm:text-xs p-1 text-center pointer-events-none">
                              Your Photo
                            </div>
                          )}
                          {!isDisabled && (
                            <button
                              type="button"
                              onClick={() => void handleVote(category.id, photo.id)}
                              disabled={isLoading}
                              className={`absolute bottom-1 left-1 right-1 z-20 py-1.5 px-1 rounded text-[10px] sm:text-xs font-medium touch-manipulation min-h-[36px] disabled:opacity-50 ${
                                isSelected
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white/95 text-blue-600 active:bg-blue-100'
                              }`}
                            >
                              {isSelected ? '✓ Picked' : 'Vote'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {allCategoriesVoted && (
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-800 font-semibold text-lg">
                ✓ You&apos;ve voted in all categories! Thank you for participating.
              </p>
            </div>
          )}
        </div>
      </div>

      {galleryState && (() => {
        const category = contest.categories.find((c) => c.id === galleryState.categoryId);
        const categoryPhotos = category ? getPhotosForCategory(category.id) : [];
        if (!category || categoryPhotos.length === 0) return null;

        return (
          <VotingPhotoGallery
            photos={categoryPhotos}
            categoryId={category.id}
            categoryName={category.name}
            participantId={participant.id}
            selectedPhotoId={selectedVotes[category.id]}
            onVote={handleVote}
            isVoting={isLoading}
            open
            startIndex={galleryState.index}
            onClose={() => setGalleryState(null)}
          />
        );
      })()}
    </div>
  );
}

