'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getContest,
  getVotesByCategoryAndRank,
  getPhotosByCategory,
} from '@/lib/store';
import { Contest, Category, Photo, Participant } from '@/types';

export default function RevealPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.id as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [revealStage, setRevealStage] = useState<'intro' | 'winner' | 'votes' | 'summary'>('intro');
  const [showCollage, setShowCollage] = useState(false);

  useEffect(() => {
    const loadReveal = async () => {
      const userId = sessionStorage.getItem('userId');
      
      if (!userId) {
        router.push('/');
        return;
      }

      const loadedContest = await getContest(contestId);
      if (!loadedContest) {
        router.push('/admin');
        return;
      }
      setContest(loadedContest);
      setIsLoading(false);
      
      // Calculate winners
      await calculateWinners(loadedContest);
    };
    loadReveal();
  }, [contestId, router]);

  const [allWinners, setAllWinners] = useState<Array<{
    category: Category;
    winnerPhoto: Photo | null;
    winnerName: string;
    winnerVotes: number;
    honorablePhoto: Photo | null;
    honorableName: string;
    honorableVotes: number;
  }>>([]);

  const calculateWinners = async (loadedContest: Contest) => {
    const winners: Array<{
      category: Category;
      winnerPhoto: Photo | null;
      winnerName: string;
      winnerVotes: number;
      honorablePhoto: Photo | null;
      honorableName: string;
      honorableVotes: number;
    }> = [];

    for (const category of loadedContest.categories) {
      const categoryPhotos = (await getPhotosByCategory(category.id)).filter(p => p.submitted);
      const firstPlaceVotes = await getVotesByCategoryAndRank(category.id, 1);
      const secondPlaceVotes = await getVotesByCategoryAndRank(category.id, 2);

      const firstPlaceCounts: Record<string, number> = {};
      firstPlaceVotes.forEach(vote => {
        firstPlaceCounts[vote.photoId] = (firstPlaceCounts[vote.photoId] || 0) + 1;
      });

      const secondPlaceCounts: Record<string, number> = {};
      secondPlaceVotes.forEach(vote => {
        secondPlaceCounts[vote.photoId] = (secondPlaceCounts[vote.photoId] || 0) + 1;
      });

      let maxFirstVotes = 0;
      let winningPhotoId = '';
      Object.entries(firstPlaceCounts).forEach(([photoId, count]) => {
        if (count > maxFirstVotes) {
          maxFirstVotes = count;
          winningPhotoId = photoId;
        }
      });

      let maxSecondVotes = 0;
      let honorableMentionPhotoId = '';
      Object.entries(secondPlaceCounts).forEach(([photoId, count]) => {
        if (count > maxSecondVotes) {
          maxSecondVotes = count;
          honorableMentionPhotoId = photoId;
        }
      });

      const winningPhoto = categoryPhotos.find(p => p.id === winningPhotoId) || null;
      const honorablePhoto = categoryPhotos.find(p => p.id === honorableMentionPhotoId) || null;
      const winner = winningPhoto ? loadedContest.participants.find(p => p.id === winningPhoto.participantId) : null;
      const honorable = honorablePhoto ? loadedContest.participants.find(p => p.id === honorablePhoto.participantId) : null;

      winners.push({
        category,
        winnerPhoto: winningPhoto,
        winnerName: winner?.name || 'No winner',
        winnerVotes: maxFirstVotes,
        honorablePhoto: honorablePhoto,
        honorableName: honorable?.name || 'No honorable mention',
        honorableVotes: maxSecondVotes,
      });
    }

    setAllWinners(winners);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push(`/admin/contest/${contestId}`);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [contestId, router]);

  const currentCategory = contest?.categories?.[currentCategoryIndex];

  const [currentCategoryData, setCurrentCategoryData] = useState<{
    allPhotos: Photo[];
    firstPlaceCounts: Record<string, number>;
    secondPlaceCounts: Record<string, number>;
    winningPhotos: Photo[];
    honorablePhotos: Photo[];
    winners: Participant[];
    honorables: Participant[];
    maxFirstVotes: number;
    maxSecondVotes: number;
  } | null>(null);

  useEffect(() => {
    const loadCategoryData = async () => {
      if (!currentCategory || !contest) return;
      setCurrentCategoryData(null);

      const allPhotos = (await getPhotosByCategory(currentCategory.id)).filter(p => p.submitted);
      const firstPlaceVotes = await getVotesByCategoryAndRank(currentCategory.id, 1);
      const secondPlaceVotes = await getVotesByCategoryAndRank(currentCategory.id, 2);

      const firstPlaceCounts: Record<string, number> = {};
      firstPlaceVotes.forEach(vote => {
        firstPlaceCounts[vote.photoId] = (firstPlaceCounts[vote.photoId] || 0) + 1;
      });

      const secondPlaceCounts: Record<string, number> = {};
      secondPlaceVotes.forEach(vote => {
        secondPlaceCounts[vote.photoId] = (secondPlaceCounts[vote.photoId] || 0) + 1;
      });

      let maxFirstVotes = 0;
      Object.values(firstPlaceCounts).forEach((count) => {
        if (count > maxFirstVotes) maxFirstVotes = count;
      });
      const winningPhotoIds = Object.entries(firstPlaceCounts)
        .filter(([, count]) => count === maxFirstVotes && maxFirstVotes > 0)
        .map(([photoId]) => photoId);

      let maxSecondVotes = 0;
      Object.values(secondPlaceCounts).forEach((count) => {
        if (count > maxSecondVotes) maxSecondVotes = count;
      });
      const honorablePhotoIds = Object.entries(secondPlaceCounts)
        .filter(([, count]) => count === maxSecondVotes && maxSecondVotes > 0)
        .map(([photoId]) => photoId);

      const winningPhotos = winningPhotoIds.map((id) => allPhotos.find((p) => p.id === id)!).filter(Boolean);
      const honorablePhotos = honorablePhotoIds.map((id) => allPhotos.find((p) => p.id === id)!).filter(Boolean);
      const winners = winningPhotos.map(
        (p) => contest.participants.find((u) => u.id === p.participantId)!
      ).filter(Boolean);
      const honorables = honorablePhotos.map(
        (p) => contest.participants.find((u) => u.id === p.participantId)!
      ).filter(Boolean);

      setCurrentCategoryData({
        allPhotos,
        firstPlaceCounts,
        secondPlaceCounts,
        winningPhotos,
        honorablePhotos,
        winners,
        honorables,
        maxFirstVotes,
        maxSecondVotes,
      });
    };

    loadCategoryData();
  }, [currentCategory, contest]);

  // ========== All hooks must be above this line (Rules of Hooks) ==========
  // Do not add useState/useEffect below; early returns would change hook order.

  if (isLoading || !contest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Show summary view
  if (revealStage === 'summary') {
    const winningPhotos = allWinners
      .filter(w => w.winnerPhoto)
      .map(w => w.winnerPhoto!);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-auto">
        {/* Control Bar */}
        <div className="sticky top-0 z-50 bg-black bg-opacity-70 rounded-lg p-4 m-4 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setCurrentCategoryIndex(0);
                  setRevealStage('intro');
                  setShowCollage(false);
                }}
                className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
              >
                ← Back to Categories
              </button>
              <button
                onClick={() => setShowCollage(!showCollage)}
                className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
              >
                {showCollage ? 'Show List View' : 'Show Collage'}
              </button>
            </div>
            <Link
              href={`/admin/contest/${contestId}`}
              className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
            >
              Exit
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-7xl font-bold mb-4 animate-pulse">🏆 All Winners! 🏆</h1>
            <p className="text-3xl text-gray-300">{contest.location}</p>
            <p className="text-2xl text-gray-400 mt-2">
              {new Date(contest.date + '-01').toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {showCollage ? (
            // Collage View
            <div className="max-w-7xl mx-auto">
              <h2 className="text-5xl font-bold text-center mb-8">Winning Photos Collage</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {winningPhotos.map((photo, index) => {
                  const winnerInfo = allWinners.find(w => w.winnerPhoto?.id === photo.id);
                  return (
                    <div
                      key={photo.id}
                      className="relative group cursor-pointer"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <img
                        src={photo.url}
                        alt={winnerInfo?.winnerName}
                        className="w-full h-64 object-cover rounded-lg border-4 border-yellow-400 shadow-2xl transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent p-4 rounded-b-lg">
                        <div className="text-white font-bold text-lg">{winnerInfo?.category.name}</div>
                        <div className="text-yellow-300 text-sm">📸 {winnerInfo?.winnerName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // List View
            <div className="max-w-6xl mx-auto space-y-8">
              {allWinners.map((winnerInfo, index) => (
                <div
                  key={winnerInfo.category.id}
                  className="bg-white bg-opacity-10 rounded-lg p-8 backdrop-blur-sm border-2 border-yellow-400 animate-fade-in"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <h2 className="text-4xl font-bold mb-6 text-yellow-400">
                    {winnerInfo.category.name}
                  </h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {winnerInfo.winnerPhoto && (
                      <div>
                        <div className="mb-3">
                          <div className="text-2xl font-bold text-white">🏆 1st Place</div>
                          <div className="text-xl text-yellow-300">📸 {winnerInfo.winnerName}</div>
                          <div className="text-sm text-gray-300">
                            {winnerInfo.winnerVotes} vote{winnerInfo.winnerVotes !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <img
                          src={winnerInfo.winnerPhoto.url}
                          alt={`Winner: ${winnerInfo.winnerName}`}
                          className="w-full h-auto rounded-lg border-4 border-yellow-400 shadow-xl"
                        />
                      </div>
                    )}
                    
                    {winnerInfo.honorablePhoto && winnerInfo.honorableVotes > 0 && (
                      <div>
                        <div className="mb-3">
                          <div className="text-2xl font-bold text-white">⭐ 2nd Place</div>
                          <div className="text-xl text-purple-300">📸 {winnerInfo.honorableName}</div>
                          <div className="text-sm text-gray-300">
                            {winnerInfo.honorableVotes} vote{winnerInfo.honorableVotes !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <img
                          src={winnerInfo.honorablePhoto.url}
                          alt={`Honorable Mention: ${winnerInfo.honorableName}`}
                          className="w-full h-auto rounded-lg border-4 border-purple-400 shadow-xl"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // If no current category and not in summary, show completion message
  if (!currentCategory && (revealStage as string) !== 'summary') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">🎉 All Categories Revealed! 🎉</h1>
          <p className="text-2xl mb-8">Thank you for participating!</p>
          <button
            onClick={() => setRevealStage('summary')}
            className="inline-block bg-yellow-400 text-purple-900 px-8 py-4 rounded-lg text-xl font-semibold hover:bg-yellow-300 mb-4"
          >
            View All Winners
          </button>
          <br />
          <Link
            href={`/admin/contest/${contestId}`}
            className="inline-block bg-white text-purple-900 px-8 py-4 rounded-lg text-xl font-semibold hover:bg-gray-100"
          >
            Back to Contest
          </Link>
        </div>
      </div>
    );
  }

  if (!currentCategory || !currentCategoryData) {
    return <div className="p-8">Loading...</div>;
  }

  const {
    allPhotos,
    firstPlaceCounts,
    secondPlaceCounts,
    winningPhotos,
    honorablePhotos,
    winners,
    honorables,
    maxFirstVotes,
    maxSecondVotes,
  } = currentCategoryData;

  const handleNext = () => {
    if (currentCategoryIndex < contest.categories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
      setRevealStage('intro');
    } else {
      setRevealStage('summary');
    }
  };

  const handlePrevious = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
      setRevealStage('intro');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
      {/* Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center bg-black bg-opacity-70 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex gap-4 items-center">
          <button
            onClick={handlePrevious}
            disabled={currentCategoryIndex === 0}
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>
          <span className="text-lg font-semibold">
            Category {currentCategoryIndex + 1} of {contest.categories.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentCategoryIndex === contest.categories.length - 1}
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-sm text-gray-300 hidden md:block">
            Esc to exit
          </div>
          <button
            onClick={() => setRevealStage('intro')}
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all"
          >
            Restart category
          </button>
          <Link
            href={`/admin/contest/${contestId}`}
            className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-all"
          >
            Exit
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen p-8 pt-24">
        {/* Stage 1: Category intro + button to reveal winner */}
        {revealStage === 'intro' && (
          <div className="text-center animate-fade-in">
            <div className="mb-8">
              <div className="text-9xl mb-4 animate-bounce">📸</div>
            </div>
            <h1 className="text-8xl font-bold mb-8 animate-pulse">
              {currentCategory.name}
            </h1>
            <p className="text-4xl text-gray-300 mb-12 animate-fade-in-delay">And the results are...</p>
            <button
              onClick={() => setRevealStage('winner')}
              className="px-10 py-5 bg-yellow-400 text-purple-900 rounded-xl text-2xl font-bold hover:bg-yellow-300 shadow-2xl transition-all hover:scale-105"
            >
              Reveal winner
            </button>
          </div>
        )}

        {/* Stage 2: Winner(s) and 2nd place (with ties) + button to show all photos */}
        {revealStage === 'winner' && (
          <div className="w-full max-w-5xl text-center animate-fade-in space-y-12">
            <h2 className="text-6xl font-bold text-yellow-400 mb-8">{currentCategory.name}</h2>

            {winningPhotos.length > 0 ? (
              <div className="mb-10">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-4xl font-bold text-white mb-2">
                  {winningPhotos.length === 1 ? '1st Place Winner!' : '1st Place Winners! (tie)'}
                </h3>
                <p className="text-2xl text-gray-300 mb-6">
                  {maxFirstVotes} vote{maxFirstVotes !== 1 ? 's' : ''} each
                </p>
                <div className={`grid gap-6 ${winningPhotos.length === 1 ? 'max-w-2xl mx-auto' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {winningPhotos.map((photo, i) => {
                    const participant = winners[i] || contest.participants.find((p) => p.id === photo.participantId);
                    return (
                      <div key={photo.id} className="rounded-lg overflow-hidden border-4 border-yellow-400 shadow-2xl">
                        <img src={photo.url} alt={participant?.name} className="w-full aspect-[4/3] object-cover" />
                        <div className="p-4 bg-black/40">
                          <div className="text-xl font-bold text-yellow-300">📸 {participant?.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-2xl text-gray-400">No 1st place votes in this category.</p>
            )}

            {honorablePhotos.length > 0 && maxSecondVotes > 0 && (
              <div className="mb-10">
                <div className="text-5xl mb-2">⭐</div>
                <h3 className="text-3xl font-bold text-purple-300 mb-2">
                  {honorablePhotos.length === 1 ? '2nd Place' : '2nd Place (tie)'}
                </h3>
                <p className="text-xl text-gray-300 mb-4">
                  {maxSecondVotes} vote{maxSecondVotes !== 1 ? 's' : ''} each
                </p>
                <div className={`grid gap-4 ${honorablePhotos.length === 1 ? 'max-w-xl mx-auto' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {honorablePhotos.map((photo, i) => {
                    const participant = honorables[i] || contest.participants.find((p) => p.id === photo.participantId);
                    return (
                      <div key={photo.id} className="rounded-lg overflow-hidden border-4 border-purple-400 shadow-xl">
                        <img src={photo.url} alt={participant?.name} className="w-full aspect-[4/3] object-cover" />
                        <div className="p-3 bg-black/40">
                          <div className="text-lg font-bold text-purple-300">📸 {participant?.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={() => setRevealStage('votes')}
              className="px-10 py-5 bg-white text-purple-900 rounded-xl text-xl font-bold hover:bg-gray-200 shadow-2xl transition-all"
            >
              Show all photos & votes
            </button>
          </div>
        )}

        {/* Stage 3: All photos with vote counts + button to next category */}
        {revealStage === 'votes' && (
          <div className="w-full max-w-6xl animate-fade-in">
            <h2 className="text-5xl font-bold text-center mb-10">{currentCategory.name} — All submissions</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {allPhotos.map((photo) => {
                const participant = contest.participants.find((p) => p.id === photo.participantId);
                const firstCount = firstPlaceCounts[photo.id] || 0;
                const secondCount = secondPlaceCounts[photo.id] || 0;
                const isWinner = winningPhotos.some((p) => p.id === photo.id);
                const isHonorable = honorablePhotos.some((p) => p.id === photo.id);

                return (
                  <div
                    key={photo.id}
                    className={`bg-white bg-opacity-10 rounded-lg overflow-hidden border-4 transition-all ${
                      isWinner ? 'border-yellow-400 shadow-lg shadow-yellow-400/30' : isHonorable ? 'border-purple-400 shadow-lg shadow-purple-400/30' : 'border-white/20'
                    }`}
                  >
                    <img src={photo.url} alt={participant?.name} className="w-full h-56 object-cover" />
                    <div className="p-4">
                      <div className="text-xl font-bold mb-2">{participant?.name}</div>
                      <div className="space-y-1 text-sm">
                        <div className="text-yellow-300">1st: {firstCount} vote{firstCount !== 1 ? 's' : ''}</div>
                        <div className="text-purple-300">2nd: {secondCount} vote{secondCount !== 1 ? 's' : ''}</div>
                        {firstCount === 0 && secondCount === 0 && <div className="text-gray-400">No votes</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-center">
              <button
                onClick={handleNext}
                className="px-10 py-5 bg-yellow-400 text-purple-900 rounded-xl text-2xl font-bold hover:bg-yellow-300 shadow-2xl transition-all hover:scale-105"
              >
                {currentCategoryIndex < contest.categories.length - 1 ? 'Next category →' : '🎉 View all winners'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in-delay {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          50% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in-delay 1.5s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 1.2s ease-out;
        }
      `}</style>
    </div>
  );
}

