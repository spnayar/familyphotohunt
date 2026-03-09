'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getContest,
  updateContest,
  addCategory,
  updateCategory,
  deleteCategory,
  deleteParticipant,
  getPhotosByParticipant,
} from '@/lib/store';
import { categorySuggestions } from '@/lib/category-suggestions';
import { Contest, Category, Participant } from '@/types';

export default function ContestAdminPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.id as string;
  
  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDescription, setEditCategoryDescription] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [participantSubmissionStatus, setParticipantSubmissionStatus] = useState<Record<string, { submitted: boolean; submittedCount: number; totalCategories: number }>>({});

  useEffect(() => {
    const loadContest = async () => {
      const userId = sessionStorage.getItem('userId');
      
      if (!userId) {
        router.push('/');
        return;
      }

      // Load contest
      const loadedContest = await getContest(contestId);
      if (!loadedContest) {
        router.push('/admin');
        return;
      }
      setContest(loadedContest);
      setIsLoading(false);
    
      // Load submission status for each participant
      const statusMap: Record<string, { submitted: boolean; submittedCount: number; totalCategories: number }> = {};
      for (const participant of loadedContest.participants) {
        const participantPhotos = await getPhotosByParticipant(participant.id);
        const submittedPhotos = participantPhotos.filter(p => p.submitted);
        const submittedCount = submittedPhotos.length;
        const totalCategories = loadedContest.categories.length;
        const submitted = submittedCount === totalCategories && totalCategories > 0;
        
        statusMap[participant.id] = {
          submitted,
          submittedCount,
          totalCategories,
        };
      }
      setParticipantSubmissionStatus(statusMap);
    };
    loadContest();
  }, [contestId, router]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !contest) return;
    
    await addCategory(contestId, { 
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim() || undefined
    });
    const updated = await getContest(contestId);
    if (updated) {
      setContest({ ...updated }); // Create new object to trigger re-render
    }
    setNewCategoryName('');
    setNewCategoryDescription('');
    setShowCategoryForm(false);
  };

  const handleAddSuggestedCategory = async (suggestion: typeof categorySuggestions[0]) => {
    if (!contest) return;
    
    // Check if category already exists
    const exists = contest.categories.some(c => c.name.toLowerCase() === suggestion.name.toLowerCase());
    if (exists) {
      alert(`Category "${suggestion.name}" already exists!`);
      return;
    }
    
    await addCategory(contestId, {
      name: suggestion.name,
      description: suggestion.description
    });
    
    // Force UI update by getting fresh contest data
    const updated = await getContest(contestId);
    if (updated) {
      setContest({ ...updated }); // Create new object to trigger re-render
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description || '');
  };

  const handleSaveEditCategory = async (categoryId: string) => {
    if (!editCategoryName.trim()) {
      alert('Category name cannot be empty');
      return;
    }
    
    await updateCategory(contestId, categoryId, {
      name: editCategoryName.trim(),
      description: editCategoryDescription.trim() || undefined,
    });
    
    const updated = await getContest(contestId);
    if (updated) {
      setContest({ ...updated });
    }
    
    setEditingCategoryId(null);
    setEditCategoryName('');
    setEditCategoryDescription('');
  };

  const handleCancelEdit = () => {
    setEditingCategoryId(null);
    setEditCategoryName('');
    setEditCategoryDescription('');
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    await deleteCategory(contestId, categoryId);
    const updated = await getContest(contestId);
    if (updated) {
      setContest({ ...updated }); // Create new object to trigger re-render
    }
  };


  const handleStatusChange = async (newStatus: Contest['status']) => {
    if (!contest) return;
    await updateContest(contestId, { status: newStatus });
    const updated = await getContest(contestId);
    if (updated) setContest(updated);
  };

  const handleToggleContestClosed = async () => {
    if (!contest) return;
    const isCurrentlyClosed = contest.status === 'voting' || contest.status === 'completed';

    if (!isCurrentlyClosed) {
      // Opening the toggle - close the contest
      if (confirm('Are you sure you want to close this contest and start voting?\n\nOnce closed, participants will be able to vote on all submitted photos but cannot add new photos. This action can be reversed.')) {
        await handleStatusChange('voting');
      }
    } else {
      // Closing the toggle - reopen the contest
      if (confirm('Reopen this contest? Participants will be able to add new photos again.')) {
        await handleStatusChange('active');
      }
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('userId');
    router.push('/');
  };

  if (isLoading || !contest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div>
              <div className="mb-2 flex gap-4 items-center">
                <Link href="/admin" className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-sm sm:text-base touch-manipulation min-h-[44px] flex items-center">
                  ← Back to Admin
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-800 active:text-red-900 text-sm sm:text-base touch-manipulation min-h-[44px] px-2"
                >
                  Logout
                </button>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                {contest.location}
              </h1>
              <p className="text-base sm:text-lg text-gray-700 font-medium mt-1">
                {new Date(contest.date + '-01').toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {contest.joinCode && (
                <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Join Code:</p>
                  <p className="text-2xl font-mono font-bold text-blue-600 tracking-widest">
                    {contest.joinCode}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Share this code with participants so they can join this contest
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-white rounded-lg p-4 border-2 border-gray-300 shadow-sm">
                <span className="text-sm sm:text-base font-medium text-gray-700">
                  Contest Closed (Start Voting)
                </span>
                <button
                  type="button"
                  onClick={handleToggleContestClosed}
                  className="relative inline-flex items-center cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-300 rounded-full"
                  role="switch"
                  aria-checked={contest.status === 'voting' || contest.status === 'completed'}
                >
                  <div className={`w-14 h-8 rounded-full transition-colors duration-200 ${
                    contest.status === 'voting' || contest.status === 'completed' 
                      ? 'bg-green-600' 
                      : 'bg-gray-300'
                  }`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 mt-1 ${
                      contest.status === 'voting' || contest.status === 'completed' 
                        ? 'translate-x-7' 
                        : 'translate-x-1'
                    }`}></div>
                  </div>
                </button>
              </div>
              {(contest.status === 'voting' || contest.status === 'completed') && (
                <div className="px-4 py-2 bg-green-50 border border-green-300 rounded-lg">
                  <p className="text-sm text-green-800">
                    {contest.status === 'voting' 
                      ? '✓ Contest is closed. Participants can vote but cannot add new photos.' 
                      : '✓ Contest is completed.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href={`/admin/contest/${contestId}/results`}
              className="w-full sm:w-auto inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors touch-manipulation min-h-[44px] text-center text-sm sm:text-base"
            >
              View Results
            </Link>
            <Link
              href={`/admin/contest/${contestId}/reveal`}
              className="w-full sm:w-auto inline-block bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-lg hover:from-yellow-600 hover:to-orange-600 active:from-yellow-700 active:to-orange-700 transition-colors font-semibold text-base sm:text-lg touch-manipulation min-h-[44px] text-center"
            >
              🎬 Start Winner Reveal (TV Mode)
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            {/* Categories Section */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Categories</h2>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowCategorySuggestions(true)}
                    className="w-full sm:w-auto bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 active:bg-green-800 text-base sm:text-lg font-semibold touch-manipulation min-h-[44px]"
                  >
                    📋 Suggested Categories
                  </button>
                  <button
                    onClick={() => setShowCategoryForm(true)}
                    className="w-full sm:w-auto bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 text-base sm:text-lg font-semibold touch-manipulation min-h-[44px]"
                  >
                    + Add Custom Category
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {contest.categories.map((category) => (
                  <div
                    key={category.id}
                    className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                  >
                    {editingCategoryId === category.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div>
                          <label className="block text-gray-900 font-semibold mb-2 text-base sm:text-lg">
                            Category Name
                          </label>
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg text-lg font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-gray-900 font-semibold mb-2 text-base sm:text-lg">
                            Description
                          </label>
                          <textarea
                            value={editCategoryDescription}
                            onChange={(e) => setEditCategoryDescription(e.target.value)}
                            placeholder="Describe the category rules or what participants should look for..."
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg text-base font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEditCategory(category.id)}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 touch-manipulation min-h-[44px] text-base font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 active:bg-gray-500 touch-manipulation min-h-[44px] text-base font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-gray-700">{category.description}</p>
                          )}
                          {!category.description && (
                            <p className="text-xs text-gray-500 italic">No description added</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-sm sm:text-base font-medium px-3 py-2 rounded-lg border border-blue-300 hover:bg-blue-50 active:bg-blue-100 touch-manipulation min-h-[36px] whitespace-nowrap"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-red-600 hover:text-red-800 active:text-red-900 text-sm sm:text-base font-medium px-3 py-2 rounded-lg border border-red-300 hover:bg-red-50 active:bg-red-100 touch-manipulation min-h-[36px] whitespace-nowrap"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {contest.categories.length === 0 && (
                  <p className="text-gray-600 text-base font-medium text-center py-4">No categories yet. Add some suggested categories or create your own!</p>
                )}
              </div>
            </div>

            {/* Participants Section */}
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Participants</h2>
              </div>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>How participants join:</strong> Share the join code (shown above) with participants. 
                  They will create an account at the login page and use the join code to join this contest.
                </p>
              </div>

              <div className="space-y-2">
                {contest.participants.map((participant) => {
                  const status = participantSubmissionStatus[participant.id];
                  const hasSubmitted = status?.submitted || false;
                  const submittedCount = status?.submittedCount || 0;
                  const totalCategories = status?.totalCategories || contest.categories.length;
                  
                  return (
                    <div
                      key={participant.id}
                      className={`p-4 rounded-lg border-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${
                        hasSubmitted 
                          ? 'bg-green-50 border-green-300' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="font-bold text-gray-900 text-base sm:text-lg">{participant.name}</div>
                          {hasSubmitted ? (
                            <span className="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                              ✓ Submitted
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
                              Not Submitted
                            </span>
                          )}
                        </div>
                        <div className="text-sm sm:text-base text-gray-700 font-medium mb-1">{participant.email}</div>
                        {participant.phone && (
                          <div className="text-sm sm:text-base text-gray-700 font-medium mb-2">{participant.phone}</div>
                        )}
                        <div className="text-xs sm:text-sm text-gray-600 mt-2">
                          {submittedCount} of {totalCategories} categories submitted
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(`Are you sure you want to remove ${participant.name} from this contest?\n\nThis will also delete all their photos and votes.`)) {
                            await deleteParticipant(contestId, participant.id);
                            const updated = await getContest(contestId);
                            if (updated) {
                              setContest(updated);
                              // Update status map
                              const newStatusMap = { ...participantSubmissionStatus };
                              delete newStatusMap[participant.id];
                              setParticipantSubmissionStatus(newStatusMap);
                            }
                          }
                        }}
                        className="text-red-600 hover:text-red-800 active:text-red-900 text-sm sm:text-base font-medium px-4 py-2 rounded-lg border border-red-300 hover:bg-red-50 active:bg-red-100 touch-manipulation min-h-[44px] whitespace-nowrap"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                {contest.participants.length === 0 && (
                  <p className="text-gray-600 text-base font-medium">No participants yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen Modal for Suggested Categories */}
      {showCategorySuggestions && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCategorySuggestions(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Suggested Categories</h2>
              <button
                onClick={() => {
                  setShowCategorySuggestions(false);
                }}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categorySuggestions.map((suggestion, index) => {
                  const alreadyAdded = contest?.categories.some(
                    c => c.name.toLowerCase() === suggestion.name.toLowerCase()
                  );
                  return (
                    <div
                      key={`${suggestion.name}-${index}`}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        alreadyAdded
                          ? 'bg-green-100 border-green-400'
                          : 'bg-white border-green-300 hover:border-green-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg">{suggestion.name}</h4>
                        {alreadyAdded ? (
                          <span className="text-sm text-green-700 font-semibold whitespace-nowrap flex items-center gap-1">
                            <span className="text-green-600">✓</span> Added
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              await handleAddSuggestedCategory(suggestion);
                              // Optionally close modal after adding, or keep it open
                            }}
                            className="text-green-600 hover:text-green-800 active:text-green-900 text-sm font-medium px-3 py-1 rounded-lg border border-green-300 hover:bg-green-50 active:bg-green-100 touch-manipulation min-h-[32px] transition-all"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{suggestion.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowCategorySuggestions(false);
                }}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 active:bg-gray-800 transition-colors font-semibold text-base touch-manipulation min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Modal for Add Custom Category */}
      {showCategoryForm && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCategoryForm(false);
              setNewCategoryName('');
              setNewCategoryDescription('');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl w-full h-full max-w-4xl max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Add Custom Category</h2>
              <button
                onClick={() => {
                  setShowCategoryForm(false);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                }}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={async (e) => {
                await handleAddCategory(e);
                setShowCategoryForm(false);
              }} className="space-y-6">
                <div>
                  <label className="block text-gray-900 font-semibold mb-2 text-lg sm:text-xl">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Animal, Architecture, Flora"
                    className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg text-lg font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-gray-900 font-semibold mb-2 text-lg sm:text-xl">
                    Description (optional)
                  </label>
                  <textarea
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    placeholder="Describe the category rules or what participants should look for..."
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg text-base font-medium text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 touch-manipulation resize-none"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCategoryForm(false);
                  setNewCategoryName('');
                  setNewCategoryDescription('');
                }}
                className="bg-gray-300 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-400 active:bg-gray-500 transition-colors font-semibold text-base touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  if (newCategoryName.trim()) {
                    await handleAddCategory(e as any);
                    setShowCategoryForm(false);
                  }
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-semibold text-base touch-manipulation min-h-[44px]"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

