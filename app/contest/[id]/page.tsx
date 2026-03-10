'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getContest,
  getParticipantByUserId,
  getPhotosByParticipant,
  getPhotosByParticipantAndCategory,
  addPhoto,
  updatePhoto,
  deletePhoto,
  hasVoted,
  getVotesByCategory,
  addVote,
  getVoteByVoterCategoryAndRank,
  getUser,
} from '@/lib/store';
import { Contest, Participant, Photo, Category } from '@/types';

export default function ContestPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.id as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [draggedPhoto, setDraggedPhoto] = useState<string | null>(null);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<Photo | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const userId = sessionStorage.getItem('userId');
    const loadData = async () => {
      if (!userId) {
        router.push('/');
        return;
      }

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
      
      // Check if user has already submitted (all categories have submitted photos)
      const allSubmitted = loadedContest.categories.every(category => {
        const categoryPhotos = loadedPhotos.filter(p => p.categoryId === category.id);
        return categoryPhotos.some(p => p.submitted);
      });
      setReadyToSubmit(allSubmitted);
    };
    loadData();
  }, [contestId, router]);

  // Load user info for avatar
  useEffect(() => {
    const loadUserInfo = async () => {
      const userId = sessionStorage.getItem('userId');
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

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const photoUrl = reader.result as string;
      try {
        const newPhoto = await addPhoto({
          contestId,
          categoryId,
          participantId: participant.id,
          url: photoUrl,
          fileName: file.name,
          submitted: false,
        });
        setPhotos([...photos, newPhoto]);
      } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Failed to upload photo. Please try again.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragStart = (e: React.DragEvent, photoId: string) => {
    setDraggedPhoto(photoId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetPhotoId: string, categoryId: string) => {
    e.preventDefault();
    if (!draggedPhoto || draggedPhoto === targetPhotoId) {
      setDraggedPhoto(null);
      return;
    }

    const categoryPhotos = getDraftPhotosForCategory(categoryId);
    const draggedIndex = categoryPhotos.findIndex(p => p.id === draggedPhoto);
    const targetIndex = categoryPhotos.findIndex(p => p.id === targetPhotoId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPhoto(null);
      return;
    }

    // Calculate new ranks
    const newRanks: { id: string; rank: number }[] = [];
    const photosToUpdate = [...categoryPhotos];
    
    // Remove dragged photo from array
    const [draggedPhotoObj] = photosToUpdate.splice(draggedIndex, 1);
    // Insert at new position
    photosToUpdate.splice(targetIndex, 0, draggedPhotoObj);

    // Assign new ranks
    photosToUpdate.forEach((photo, index) => {
      newRanks.push({ id: photo.id, rank: index + 1 });
    });

    // Update all photos in the category
    for (const { id, rank } of newRanks) {
      await updatePhoto(id, { rank });
    }

    // Reload photos
    if (participant) {
      const updatedPhotos = await getPhotosByParticipant(participant.id);
      setPhotos(updatedPhotos);
    }

    setDraggedPhoto(null);
  };

  const movePhotoInCategory = async (categoryId: string, photoId: string, direction: 'up' | 'down') => {
    if (!participant) return;

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
  };

  const handleReadyToSubmitToggle = async (checked: boolean) => {
    if (checked) {
      // Check if all categories have at least one photo
      const categoriesWithPhotos = contest?.categories.filter(category => {
        const categoryPhotos = photos.filter(p => p.categoryId === category.id && !p.submitted);
        return categoryPhotos.length > 0;
      });

      if (categoriesWithPhotos?.length !== contest?.categories.length) {
        alert('Please add at least one photo to all categories before submitting.');
        return;
      }

      // Submit top-ranked photo for each category
      for (const category of contest?.categories || []) {
        const categoryPhotos = photos.filter(p => p.categoryId === category.id && !p.submitted);
        const topPhoto = categoryPhotos.find(p => p.rank === 1) || categoryPhotos[0];
        
        if (topPhoto) {
          // Mark this photo as submitted
          await updatePhoto(topPhoto.id, { submitted: true });
          
          // Mark all other photos in this category as not submitted
          for (const photo of categoryPhotos) {
            if (photo.id !== topPhoto.id) {
              await updatePhoto(photo.id, { submitted: false });
            }
          }
        }
      }

      // Reload photos
      if (participant) {
        const updatedPhotos = await getPhotosByParticipant(participant.id);
        setPhotos(updatedPhotos);
      }
    } else {
      // Unsubmit all photos
      const submittedPhotos = photos.filter(p => p.submitted);
      for (const photo of submittedPhotos) {
        await updatePhoto(photo.id, { submitted: false });
      }

      // Reload photos
      if (participant) {
        const updatedPhotos = await getPhotosByParticipant(participant.id);
        setPhotos(updatedPhotos);
      }
    }

    setReadyToSubmit(checked);
  };

  const getSubmittedPhotoForCategory = (categoryId: string): Photo | undefined => {
    return photos.find(p => p.categoryId === categoryId && p.submitted);
  };

  const getDraftPhotosForCategory = (categoryId: string): Photo[] => {
    return photos.filter(p => p.categoryId === categoryId && !p.submitted).sort((a, b) => (a.rank || 999) - (b.rank || 999));
  };

  // Voting mode is determined by contest status, not by submission completion
  // Only when the admin sets the contest status to 'voting' or 'completed' will voting be enabled
  const isVotingMode = contest?.status === 'voting' || contest?.status === 'completed';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('userId');
    router.push('/');
  };

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
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
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

  if (!contest || !participant) {
    return <div className="p-8">Loading...</div>;
  }

  if (isVotingMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserAvatar />
        <VotingView contest={contest} participant={participant} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <UserAvatar />

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
              Upload photos for each category, drag and drop to rank them (top photo will be submitted), then toggle "Ready to submit" when done.
            </p>
            
            {/* Ready to Submit Toggle */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6 border-2 border-gray-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-base sm:text-lg font-semibold text-gray-900 block mb-1">
                    Ready to Submit
                  </label>
                  <p className="text-sm text-gray-600">
                    {readyToSubmit 
                      ? 'Your top-ranked photo for each category has been submitted.'
                      : 'Toggle on to submit your top-ranked photo for each category. All categories must have at least one photo.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReadyToSubmitToggle(!readyToSubmit)}
                  className={`relative inline-flex items-center cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-full ml-4`}
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
          </div>

          <div className="space-y-6 sm:space-y-8">
            {contest.categories.map((category) => {
              const submittedPhoto = getSubmittedPhotoForCategory(category.id);
              const draftPhotos = getDraftPhotosForCategory(category.id);
              const hasSubmitted = !!submittedPhoto;
              const hasPhotos = draftPhotos.length > 0 || hasSubmitted;

              return (
                <div 
                  key={category.id} 
                  className={`bg-white rounded-lg shadow-lg p-6 sm:p-8 ${
                    !hasPhotos ? 'border-2 border-red-300 bg-red-50' : ''
                  }`}
                >
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">{category.name}</h2>
                      {!hasPhotos && (
                        <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-xs sm:text-sm font-semibold">
                          No Photos
                        </span>
                      )}
                      {hasSubmitted && (
                        <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs sm:text-sm font-semibold">
                          ✓ Submitted
                        </span>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm sm:text-base text-gray-700 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                        {category.description}
                      </p>
                    )}
                  </div>
                  
                  {hasSubmitted ? (
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
                      <button
                        onClick={async () => {
                          if (confirm('Do you want to change your submission? This will turn off "Ready to Submit" and you can reorder your photos.')) {
                            await updatePhoto(submittedPhoto.id, { submitted: false });
                            setReadyToSubmit(false);
                            if (participant) {
                              const updatedPhotos = await getPhotosByParticipant(participant.id);
                              setPhotos(updatedPhotos);
                            }
                          }
                        }}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Change Submission
                      </button>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium mb-4">
                        Not Yet Submitted
                      </div>
                      
                      {/* Upload Section - Disabled when contest is closed */}
                      {isVotingMode ? (
                        <div className="mb-6 p-4 bg-gray-100 border-2 border-gray-300 rounded-lg">
                          <p className="text-sm text-gray-600 text-center">
                            Contest is closed. You can view your photos but cannot add new ones.
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
                            disabled={uploading}
                            className="hidden"
                            id={`photo-input-${category.id}`}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`photo-input-${category.id}`)?.click()}
                            disabled={uploading}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-base touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <span className="text-xl">📷</span>
                            <span>{uploading ? 'Uploading...' : 'Take or Choose Photo'}</span>
                          </button>
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            Tap the button above to take a new photo with your camera or choose from your photo library
                          </p>
                        </div>
                      )}

                      {draftPhotos.length === 0 && !isVotingMode && (
                        <p className="text-gray-500 text-sm text-center">No photos added yet for this category</p>
                      )}
                    </div>
                  )}

                  {!hasSubmitted && draftPhotos.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
                        Your Photos {isVotingMode ? '' : '- Drag to Rank (Top photo will be submitted)'}
                      </h3>
                      {!isVotingMode && (
                        <p className="text-sm text-gray-600 mb-4">
                          Drag and drop photos to reorder them. The photo at the top will be submitted when you toggle "Ready to Submit".
                        </p>
                      )}
                      {isVotingMode && (
                        <p className="text-sm text-gray-600 mb-4">
                          Contest is closed. You can view your photos but cannot modify them.
                        </p>
                      )}
                      <div className="space-y-3">
                        {draftPhotos.map((photo, index) => {
                          const isTopRanked = photo.rank === 1 || index === 0;
                          return (
                            <div
                              key={photo.id}
                              draggable={!isVotingMode}
                              onDragStart={(e) => handleDragStart(e, photo.id)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, photo.id, category.id)}
                              className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-move ${
                                isTopRanked && !isVotingMode
                                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 shadow-lg'
                                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                              } ${draggedPhoto === photo.id ? 'opacity-50' : ''}`}
                            >
                              <div className="relative w-full sm:w-40 h-56 sm:h-40 flex-shrink-0">
                                <img
                                  src={photo.url}
                                  alt={`Photo ${index + 1}`}
                                  className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setSelectedPhotoForView(photo)}
                                />
                              </div>
                              {!isVotingMode ? (
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
                                    <p className="text-xs text-gray-500 mt-1">
                                      Drag or use the arrows to reorder
                                    </p>
                                    <div className="mt-2 flex gap-2">
                                      <button
                                        type="button"
                                        disabled={index === 0 || uploading}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await movePhotoInCategory(category.id, photo.id, 'up');
                                        }}
                                        className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-xs sm:text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                                      >
                                        ↑ Move Up
                                      </button>
                                      <button
                                        type="button"
                                        disabled={index === draftPhotos.length - 1 || uploading}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await movePhotoInCategory(category.id, photo.id, 'down');
                                        }}
                                        className="px-3 py-1 rounded-lg border border-gray-300 bg-white text-xs sm:text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                                      >
                                        ↓ Move Down
                                      </button>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('Delete this photo?')) {
                                        const handleDelete = async () => {
                                          await deletePhoto(photo.id);
                                          if (participant) {
                                            const updatedPhotos = await getPhotosByParticipant(participant.id);
                                            setPhotos(updatedPhotos);
                                          }
                                        };
                                        handleDelete();
                                      }
                                    }}
                                    className="w-full sm:w-auto text-red-600 hover:text-red-800 active:text-red-900 px-4 py-2 rounded-lg border border-red-300 hover:bg-red-50 touch-manipulation min-h-[44px] text-sm sm:text-base font-medium"
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <div className="flex-1 w-full sm:w-auto">
                                  <p className="text-sm text-gray-600">
                                    Rank: {photo.rank || index + 1}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!hasPhotos && !isVotingMode && (
                    <div className="mt-4 pt-4 border-t border-red-200">
                      <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                        <p className="text-sm text-red-800 text-center font-medium">
                          ⚠️ No photos uploaded for this category. Add at least one photo to enable submission.
                        </p>
                      </div>
                    </div>
                  )}
                  {!hasSubmitted && draftPhotos.length > 0 && isVotingMode && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                        <p className="text-sm text-yellow-800 text-center">
                          Contest is closed. You cannot submit new photos, but you can view your existing photos.
                        </p>
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

function VotingView({ contest, participant }: { contest: Contest; participant: Participant }) {
  const [selectedVotes, setSelectedVotes] = useState<Record<string, { first?: string; second?: string }>>({});
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [selectedPhotoForView, setSelectedPhotoForView] = useState<Photo | null>(null);

  useEffect(() => {
    // Load all submitted photos
    const loadSubmittedPhotos = async () => {
      const submitted: Photo[] = [];
      for (const category of contest.categories) {
        for (const p of contest.participants) {
          const photos = await getPhotosByParticipantAndCategory(p.id, category.id);
          const submittedPhoto = photos.find(ph => ph.submitted);
          if (submittedPhoto) {
            submitted.push(submittedPhoto);
          }
        }
      }
      setAllPhotos(submitted);
    };
    loadSubmittedPhotos();

    // Load existing votes
    const loadVotes = async () => {
      const votes: Record<string, { first?: string; second?: string }> = {};
      for (const category of contest.categories) {
        const firstVote = await getVoteByVoterCategoryAndRank(participant.id, category.id, 1);
        const secondVote = await getVoteByVoterCategoryAndRank(participant.id, category.id, 2);
        votes[category.id] = {
          first: firstVote?.photoId,
          second: secondVote?.photoId,
        };
      }
      setSelectedVotes(votes);
    };
    loadVotes();
  }, [contest, participant]);

  const getPhotosForCategory = (categoryId: string): Photo[] => {
    const categoryPhotos = allPhotos.filter(p => p.categoryId === categoryId);
    // Randomize order
    return [...categoryPhotos].sort(() => Math.random() - 0.5);
  };

  const handleVote = async (categoryId: string, photoId: string, rank: number) => {
    // Check if this is the user's own photo
    const photo = allPhotos.find(p => p.id === photoId);
    if (photo && photo.participantId === participant.id) {
      alert("You cannot vote for your own photo!");
      return;
    }

    // Check if this photo is already selected for the other rank
    const currentVotes = selectedVotes[categoryId] || {};
    if (rank === 1 && currentVotes.second === photoId) {
      alert("You've already selected this photo for honorable mention. Please choose a different photo for 1st place.");
      return;
    }
    if (rank === 2 && currentVotes.first === photoId) {
      alert("You've already selected this photo for 1st place. Please choose a different photo for honorable mention.");
      return;
    }

    setSelectedVotes({
      ...selectedVotes,
      [categoryId]: {
        ...currentVotes,
        [rank === 1 ? 'first' : 'second']: photoId,
      },
    });
    
    // Save vote (addVote automatically replaces existing votes of the same rank)
    await addVote({
      contestId: contest.id,
      categoryId,
      voterId: participant.id,
      photoId,
      rank,
    });
  };

  const allCategoriesVoted = contest.categories.every(cat => {
    const votes = selectedVotes[cat.id];
    return votes?.first && votes?.second;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
                sessionStorage.removeItem('userId');
                window.location.href = '/login';
              }}
              className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-sm sm:text-base touch-manipulation min-h-[44px] px-2"
            >
              Logout
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 sm:mb-6">
            <p className="text-sm sm:text-base text-blue-800">
              <strong>All participants have submitted!</strong> Now it's time to vote. 
              Select your favorite photo (1st place) and an honorable mention (2nd place) for each category. 
              Photos are displayed anonymously and in random order. You cannot vote for your own photo.
            </p>
          </div>

          <div className="space-y-6 sm:space-y-8">
            {contest.categories.map((category) => {
              const categoryPhotos = getPhotosForCategory(category.id);
              const categoryVotes = selectedVotes[category.id] || {};
              const selectedFirst = categoryVotes.first;
              const selectedSecond = categoryVotes.second;

              return (
                <div key={category.id} className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                  <h2 className="text-xl sm:text-2xl font-semibold mb-4">{category.name}</h2>
                  
                  <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h3 className="font-semibold text-blue-900 mb-2">1st Place</h3>
                      <p className="text-sm text-blue-700">Select your favorite photo</p>
                      {selectedFirst && (
                        <div className="mt-2 text-sm text-blue-600">✓ Selected</div>
                      )}
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h3 className="font-semibold text-purple-900 mb-2">Honorable Mention (2nd Place)</h3>
                      <p className="text-sm text-purple-700">Select your second favorite photo</p>
                      {selectedSecond && (
                        <div className="mt-2 text-sm text-purple-600">✓ Selected</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {categoryPhotos.map((photo) => {
                      const isMyPhoto = photo.participantId === participant.id;
                      const isFirst = selectedFirst === photo.id;
                      const isSecond = selectedSecond === photo.id;
                      const isDisabled = isMyPhoto;

                      return (
                        <div
                          key={photo.id}
                          className={`relative border-2 rounded-lg overflow-hidden transition-all ${
                            isFirst
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : isSecond
                              ? 'border-purple-500 ring-2 ring-purple-200'
                              : isDisabled
                              ? 'border-gray-200 opacity-60'
                              : 'border-gray-200 active:border-gray-400'
                          }`}
                        >
                          <img
                            src={photo.url}
                            alt={`Photo for ${category.name}`}
                            className="w-full h-48 sm:h-64 object-cover cursor-pointer"
                            onClick={() => setSelectedPhotoForView(photo)}
                          />
                          {isFirst && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-sm sm:text-base">
                              1
                            </div>
                          )}
                          {isSecond && (
                            <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-sm sm:text-base">
                              2
                            </div>
                          )}
                          {isMyPhoto && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-75 text-white text-xs p-2 text-center">
                              Your Photo
                            </div>
                          )}
                          {!isDisabled && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 flex gap-2">
                              <button
                                onClick={() => handleVote(category.id, photo.id, 1)}
                                className={`flex-1 py-2 px-2 rounded text-xs sm:text-sm font-medium touch-manipulation min-h-[44px] ${
                                  isFirst
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white text-blue-600 active:bg-blue-100'
                                }`}
                              >
                                {isFirst ? '1st ✓' : 'Vote 1st'}
                              </button>
                              <button
                                onClick={() => handleVote(category.id, photo.id, 2)}
                                className={`flex-1 py-2 px-2 rounded text-xs sm:text-sm font-medium touch-manipulation min-h-[44px] ${
                                  isSecond
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-white text-purple-600 active:bg-purple-100'
                                }`}
                              >
                                {isSecond ? '2nd ✓' : 'Vote 2nd'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedFirst && selectedSecond && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 text-sm">
                        ✓ You've voted for both 1st place and honorable mention in this category
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {allCategoriesVoted && (
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-800 font-semibold text-lg">
                ✓ You've voted for 1st place and honorable mention in all categories! Thank you for participating.
              </p>
            </div>
          )}
        </div>
      </div>

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

