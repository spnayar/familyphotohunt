'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getContest,
  getVotesByCategory,
  getPhotosByCategory,
} from '@/lib/store';
import { countVotesByPhoto, getTopVotedPhotoIds } from '@/lib/vote-results';
import { Contest } from '@/types';
import { PageLoader } from '@/components/PageLoader';

type CategoryWinner = {
  photoId: string;
  votes: number;
  participantName: string;
};

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.id as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<Record<string, CategoryWinner[]>>({});
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, any[]>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    const loadResults = async () => {
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

      await calculateResults(loadedContest);
    };
    loadResults();
  }, [contestId, router]);

  const calculateResults = async (loadedContest: Contest) => {
    const categoryResults: Record<string, CategoryWinner[]> = {};
    const photosByCategory: Record<string, any[]> = {};
    const countsByCategory: Record<string, Record<string, number>> = {};

    for (const category of loadedContest.categories) {
      const votes = await getVotesByCategory(category.id);
      const voteCountsForCategory = countVotesByPhoto(votes);
      const { photoIds: winningPhotoIds, maxVotes } = getTopVotedPhotoIds(voteCountsForCategory);

      countsByCategory[category.id] = voteCountsForCategory;

      const photos = await getPhotosByCategory(category.id);
      photosByCategory[category.id] = photos.filter((p) => p.submitted);

      categoryResults[category.id] = winningPhotoIds
        .map((photoId) => {
          const photo = photosByCategory[category.id].find((p) => p.id === photoId);
          if (!photo) return null;
          const participant = loadedContest.participants.find((p) => p.id === photo.participantId);
          return {
            photoId,
            votes: maxVotes,
            participantName: participant?.name || 'Unknown',
          };
        })
        .filter((winner): winner is CategoryWinner => winner !== null);
    }

    setResults(categoryResults);
    setCategoryPhotos(photosByCategory);
    setVoteCounts(countsByCategory);
  };

  if (isLoading || !contest) {
    return <PageLoader message="Loading results..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Link href={`/admin/contest/${contestId}`} className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
                ← Back to Contest
              </Link>
              <h1 className="text-4xl font-bold text-gray-900">Contest Results</h1>
              <p className="text-gray-600 mt-1">
                {contest.location} - {new Date(contest.date + '-01').toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {contest.categories.map((category) => {
              const winners = results[category.id] || [];
              const allPhotos = categoryPhotos[category.id] || [];
              const categoryVoteCounts = voteCounts[category.id] || {};
              const winningPhotoIds = new Set(winners.map((w) => w.photoId));

              return (
                <div key={category.id} className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>

                  {winners.length > 0 ? (
                    <div className="mb-6 space-y-6">
                      {winners.map((winner) => (
                        <div key={winner.photoId}>
                          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-4">
                            <div className="text-sm text-yellow-800 mb-2">
                              🏆 {winners.length > 1 ? 'Winner (tie)' : 'Winner'}
                            </div>
                            <div className="text-2xl font-bold text-yellow-900 mb-2">
                              {winner.participantName}
                            </div>
                            <div className="text-yellow-700">
                              {winner.votes} vote{winner.votes !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="relative w-full max-w-2xl">
                            <img
                              src={allPhotos.find((p) => p.id === winner.photoId)?.url}
                              alt={`Winner for ${category.name}`}
                              className="w-full h-auto rounded-lg"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 mb-4">No votes yet</p>
                  )}

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">All Submissions</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allPhotos.map((photo) => {
                        const participant = contest.participants.find((p) => p.id === photo.participantId);
                        const voteCount = categoryVoteCounts[photo.id] || 0;
                        const isWinner = winningPhotoIds.has(photo.id);

                        return (
                          <div
                            key={photo.id}
                            className={`border-2 rounded-lg overflow-hidden ${
                              isWinner ? 'border-yellow-400' : 'border-gray-200'
                            }`}
                          >
                            <img
                              src={photo.url}
                              alt={`Photo for ${category.name}`}
                              className="w-full h-48 object-cover"
                            />
                            <div className="p-3 bg-gray-50">
                              <div className="font-medium text-sm">{participant?.name}</div>
                              <div className="text-xs text-gray-600">
                                {voteCount > 0
                                  ? `${voteCount} vote${voteCount !== 1 ? 's' : ''}`
                                  : 'No votes'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
