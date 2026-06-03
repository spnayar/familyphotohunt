'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getContest,
  getVotesByCategory,
  getPhotosByCategory,
} from '@/lib/store';
import { countVotesByPhoto, getTopVotedPhotoIds, sortPhotosByVoteCount } from '@/lib/vote-results';
import { getContestPhotosDownloadUrl } from '@/lib/photo-download';
import { Contest, Category, Photo, Participant } from '@/types';
import { PageLoader } from '@/components/PageLoader';
import { getStoredUserId } from '@/lib/auth-session';

type CategoryWinnerSummary = {
  category: Category;
  winningPhotos: Photo[];
  winnerNames: string[];
  winnerVotes: number;
};

export default function RevealPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.id as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [revealStage, setRevealStage] = useState<'intro' | 'winner' | 'votes' | 'summary'>('intro');
  const [showCollage, setShowCollage] = useState(false);
  const [allWinners, setAllWinners] = useState<CategoryWinnerSummary[]>([]);

  useEffect(() => {
    const loadReveal = async () => {
      const userId = getStoredUserId();

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

      await calculateWinners(loadedContest);
    };
    loadReveal();
  }, [contestId, router]);

  const calculateWinners = async (loadedContest: Contest) => {
    const winners: CategoryWinnerSummary[] = [];

    for (const category of loadedContest.categories) {
      const categoryPhotos = (await getPhotosByCategory(category.id)).filter((p) => p.submitted);
      const votes = await getVotesByCategory(category.id);
      const voteCounts = countVotesByPhoto(votes);
      const { photoIds: winningPhotoIds, maxVotes } = getTopVotedPhotoIds(voteCounts);

      const winningPhotos = winningPhotoIds
        .map((id) => categoryPhotos.find((p) => p.id === id))
        .filter((photo): photo is Photo => !!photo);

      const winnerNames = winningPhotos.map((photo) => {
        const participant = loadedContest.participants.find((p) => p.id === photo.participantId);
        return participant?.name || 'Unknown';
      });

      winners.push({
        category,
        winningPhotos,
        winnerNames,
        winnerVotes: maxVotes,
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
    voteCounts: Record<string, number>;
    winningPhotos: Photo[];
    winners: Participant[];
    maxVotes: number;
  } | null>(null);

  useEffect(() => {
    const loadCategoryData = async () => {
      if (!currentCategory || !contest) return;
      setCurrentCategoryData(null);

      const votes = await getVotesByCategory(currentCategory.id);
      const voteCounts = countVotesByPhoto(votes);
      const allPhotos = sortPhotosByVoteCount(
        (await getPhotosByCategory(currentCategory.id)).filter((p) => p.submitted),
        voteCounts
      );
      const { photoIds: winningPhotoIds, maxVotes } = getTopVotedPhotoIds(voteCounts);

      const winningPhotos = winningPhotoIds
        .map((id) => allPhotos.find((p) => p.id === id))
        .filter((photo): photo is Photo => !!photo);

      const winners = winningPhotos
        .map((p) => contest.participants.find((u) => u.id === p.participantId))
        .filter((participant): participant is Participant => !!participant);

      setCurrentCategoryData({
        allPhotos,
        voteCounts,
        winningPhotos,
        winners,
        maxVotes,
      });
    };

    loadCategoryData();
  }, [currentCategory, contest]);

  if (isLoading || !contest) {
    return <PageLoader message="Loading winner reveal..." />;
  }

  if (revealStage === 'summary') {
    const winningPhotos = allWinners.flatMap((w) => w.winningPhotos);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-auto">
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
          <a
            href={getContestPhotosDownloadUrl(contestId)}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            All photos
          </a>
          <a
            href={getContestPhotosDownloadUrl(contestId, { scope: 'winners' })}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Winners
          </a>
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
            <div className="max-w-7xl mx-auto">
              <h2 className="text-5xl font-bold text-center mb-8">Winning Photos Collage</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {winningPhotos.map((photo, index) => {
                  const winnerInfo = allWinners.find((w) =>
                    w.winningPhotos.some((p) => p.id === photo.id)
                  );
                  const participant = winnerInfo?.winnerNames[
                    winnerInfo.winningPhotos.findIndex((p) => p.id === photo.id)
                  ];

                  return (
                    <div
                      key={photo.id}
                      className="relative group cursor-pointer"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <img
                        src={photo.url}
                        alt={participant}
                        className="w-full h-64 object-cover rounded-lg border-4 border-yellow-400 shadow-2xl transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent p-4 rounded-b-lg">
                        <div className="text-white font-bold text-lg">{winnerInfo?.category.name}</div>
                        <div className="text-gray-200 text-sm">📸 {participant}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-8">
              {allWinners.map((winnerInfo, index) => (
                <div
                  key={winnerInfo.category.id}
                  className="bg-white bg-opacity-10 rounded-lg p-8 backdrop-blur-sm border-2 border-yellow-400 animate-fade-in"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <h2 className="text-4xl font-bold mb-6 text-white">
                    {winnerInfo.category.name}
                  </h2>

                  <div className={`grid gap-6 ${winnerInfo.winningPhotos.length > 1 ? 'md:grid-cols-2' : ''}`}>
                    {winnerInfo.winningPhotos.map((photo, photoIndex) => (
                      <div key={photo.id}>
                        <div className="mb-3">
                          <div className="text-2xl font-bold text-white">
                            🏆 {winnerInfo.winningPhotos.length > 1 ? 'Winner (tie)' : 'Winner'}
                          </div>
                          <div className="text-xl text-white">
                            📸 {winnerInfo.winnerNames[photoIndex]}
                          </div>
                          <div className="text-sm text-gray-300">
                            {winnerInfo.winnerVotes} vote{winnerInfo.winnerVotes !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <img
                          src={photo.url}
                          alt={`Winner: ${winnerInfo.winnerNames[photoIndex]}`}
                          className="w-full h-auto rounded-lg border-4 border-yellow-400 shadow-xl"
                        />
                      </div>
                    ))}
                    {winnerInfo.winningPhotos.length === 0 && (
                      <p className="text-gray-300">No votes in this category.</p>
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
    return <PageLoader message="Loading category..." />;
  }

  const { allPhotos, voteCounts, winningPhotos, winners, maxVotes } = currentCategoryData;

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
          <a
            href={getContestPhotosDownloadUrl(contestId)}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
          >
            All photos
          </a>
          <a
            href={getContestPhotosDownloadUrl(contestId, { scope: 'winners' })}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
          >
            Winners
          </a>
          <Link
            href={`/admin/contest/${contestId}`}
            className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-all"
          >
            Exit
          </Link>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen p-8 pt-24">
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

        {revealStage === 'winner' && (
          <div className="w-full max-w-5xl text-center animate-fade-in space-y-12">
            <h2 className="text-6xl font-bold text-white mb-8">{currentCategory.name}</h2>

            {winningPhotos.length > 0 ? (
              <div className="mb-10">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-4xl font-bold text-white mb-2">
                  {winningPhotos.length === 1 ? 'Winner!' : 'Winners! (tie)'}
                </h3>
                <p className="text-2xl text-gray-300 mb-6">
                  {maxVotes} vote{maxVotes !== 1 ? 's' : ''} each
                </p>
                <div className={`grid gap-6 ${winningPhotos.length === 1 ? 'max-w-2xl mx-auto' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {winningPhotos.map((photo, i) => {
                    const participant = winners[i] || contest.participants.find((p) => p.id === photo.participantId);
                    return (
                      <div key={photo.id} className="rounded-lg overflow-hidden border-4 border-yellow-400 shadow-2xl">
                        <img src={photo.url} alt={participant?.name} className="w-full aspect-[4/3] object-cover" />
                        <div className="p-4 bg-black/70">
                          <div className="text-xl font-bold text-white">📸 {participant?.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-2xl text-gray-400">No votes in this category.</p>
            )}

            <button
              onClick={() => setRevealStage('votes')}
              className="px-10 py-5 bg-white text-purple-900 rounded-xl text-xl font-bold hover:bg-gray-200 shadow-2xl transition-all"
            >
              Show all photos & votes
            </button>
          </div>
        )}

        {revealStage === 'votes' && (
          <div className="w-full max-w-6xl animate-fade-in">
            <h2 className="text-5xl font-bold text-center mb-10">{currentCategory.name} — All submissions</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {allPhotos.map((photo, index) => {
                const participant = contest.participants.find((p) => p.id === photo.participantId);
                const voteCount = voteCounts[photo.id] || 0;
                const isWinner = winningPhotos.some((p) => p.id === photo.id);

                return (
                  <div
                    key={photo.id}
                    className={`rounded-lg overflow-hidden border-4 transition-all ${
                      isWinner ? 'border-amber-400 shadow-lg shadow-amber-400/30' : 'border-white/30'
                    }`}
                  >
                    <img src={photo.url} alt={participant?.name} className="w-full h-56 object-cover" />
                    <div className="p-4 bg-gray-900 text-white">
                      <div className="text-xs font-semibold text-gray-400 mb-1">#{index + 1}</div>
                      <div className="text-lg font-bold mb-1">
                        {participant?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-300">
                        {voteCount > 0 ? `${voteCount} vote${voteCount !== 1 ? 's' : ''}` : 'No votes'}
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
