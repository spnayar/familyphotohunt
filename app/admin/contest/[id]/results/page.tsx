'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getContest,
  getVotesByCategory,
  getVotesByCategoryAndRank,
  getPhotosByCategory,
  getParticipant,
} from '@/lib/store';
import { Contest, Category } from '@/types';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.id as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<Record<string, { 
    first?: { photoId: string; votes: number; participantName: string };
    second?: { photoId: string; votes: number; participantName: string };
  }>>({});
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, any[]>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, { first: Record<string, number>; second: Record<string, number> }>>({});

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

      // Calculate results
      await calculateResults(loadedContest);
    };
    loadResults();
  }, [contestId, router]);

  const calculateResults = async (loadedContest: Contest) => {
    const categoryResults: Record<string, { 
      first?: { photoId: string; votes: number; participantName: string };
      second?: { photoId: string; votes: number; participantName: string };
    }> = {};
    const photosByCategory: Record<string, any[]> = {};
    const countsByCategory: Record<string, { first: Record<string, number>; second: Record<string, number> }> = {};
    
    for (const category of loadedContest.categories) {
      // Get votes for 1st place (rank 1)
      const firstPlaceVotes = await getVotesByCategoryAndRank(category.id, 1);
      const firstPlaceCounts: Record<string, number> = {};
      
      firstPlaceVotes.forEach(vote => {
        firstPlaceCounts[vote.photoId] = (firstPlaceCounts[vote.photoId] || 0) + 1;
      });

      // Get votes for 2nd place (rank 2)
      const secondPlaceVotes = await getVotesByCategoryAndRank(category.id, 2);
      const secondPlaceCounts: Record<string, number> = {};
      
      secondPlaceVotes.forEach(vote => {
        secondPlaceCounts[vote.photoId] = (secondPlaceCounts[vote.photoId] || 0) + 1;
      });

      // Store vote counts for display
      countsByCategory[category.id] = {
        first: firstPlaceCounts,
        second: secondPlaceCounts,
      };

      // Get photos for this category
      const photos = await getPhotosByCategory(category.id);
      photosByCategory[category.id] = photos.filter(p => p.submitted);

      // Find photo with most 1st place votes
      let maxFirstVotes = 0;
      let winningPhotoId = '';
      
      Object.entries(firstPlaceCounts).forEach(([photoId, count]) => {
        if (count > maxFirstVotes) {
          maxFirstVotes = count;
          winningPhotoId = photoId;
        }
      });

      // Find photo with most 2nd place votes
      let maxSecondVotes = 0;
      let honorableMentionPhotoId = '';
      
      Object.entries(secondPlaceCounts).forEach(([photoId, count]) => {
        if (count > maxSecondVotes) {
          maxSecondVotes = count;
          honorableMentionPhotoId = photoId;
        }
      });

      const result: { 
        first?: { photoId: string; votes: number; participantName: string };
        second?: { photoId: string; votes: number; participantName: string };
      } = {};

      if (winningPhotoId) {
        const winningPhoto = photosByCategory[category.id].find(p => p.id === winningPhotoId);
        if (winningPhoto) {
          const participant = loadedContest.participants.find(p => p.id === winningPhoto.participantId);
          result.first = {
            photoId: winningPhotoId,
            votes: maxFirstVotes,
            participantName: participant?.name || 'Unknown',
          };
        }
      }

      if (honorableMentionPhotoId) {
        const honorablePhoto = photosByCategory[category.id].find(p => p.id === honorableMentionPhotoId);
        if (honorablePhoto) {
          const participant = loadedContest.participants.find(p => p.id === honorablePhoto.participantId);
          result.second = {
            photoId: honorableMentionPhotoId,
            votes: maxSecondVotes,
            participantName: participant?.name || 'Unknown',
          };
        }
      }

      categoryResults[category.id] = result;
    }

    setResults(categoryResults);
    setCategoryPhotos(photosByCategory);
    setVoteCounts(countsByCategory);
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
              const result = results[category.id];
              const allPhotos = categoryPhotos[category.id] || [];
              const firstPlaceCounts = voteCounts[category.id]?.first || {};
              const secondPlaceCounts = voteCounts[category.id]?.second || {};

              return (
                <div key={category.id} className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4">{category.name}</h2>
                  
                  {result?.first || result?.second ? (
                    <div className="mb-6 space-y-4">
                      {result.first && (
                        <div>
                          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-4">
                            <div className="text-sm text-yellow-800 mb-2">🏆 1st Place Winner</div>
                            <div className="text-2xl font-bold text-yellow-900 mb-2">
                              {result.first.participantName}
                            </div>
                            <div className="text-yellow-700">
                              {result.first.votes} vote{result.first.votes !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="relative w-full max-w-2xl">
                            <img
                              src={allPhotos.find(p => p.id === result.first!.photoId)?.url}
                              alt={`Winner for ${category.name}`}
                              className="w-full h-auto rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                      
                      {result.second && (
                        <div>
                          <div className="bg-purple-50 border-2 border-purple-400 rounded-lg p-6 mb-4">
                            <div className="text-sm text-purple-800 mb-2">⭐ Honorable Mention (2nd Place)</div>
                            <div className="text-2xl font-bold text-purple-900 mb-2">
                              {result.second.participantName}
                            </div>
                            <div className="text-purple-700">
                              {result.second.votes} vote{result.second.votes !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="relative w-full max-w-2xl">
                            <img
                              src={allPhotos.find(p => p.id === result.second!.photoId)?.url}
                              alt={`Honorable mention for ${category.name}`}
                              className="w-full h-auto rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 mb-4">No votes yet</p>
                  )}

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">All Submissions</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allPhotos.map((photo) => {
                        const participant = contest.participants.find(p => p.id === photo.participantId);
                        const firstCount = firstPlaceCounts[photo.id] || 0;
                        const secondCount = secondPlaceCounts[photo.id] || 0;
                        const isWinner = result?.first?.photoId === photo.id;
                        const isHonorableMention = result?.second?.photoId === photo.id;

                        return (
                          <div
                            key={photo.id}
                            className={`border-2 rounded-lg overflow-hidden ${
                              isWinner ? 'border-yellow-400' : 
                              isHonorableMention ? 'border-purple-400' : 
                              'border-gray-200'
                            }`}
                          >
                            <img
                              src={photo.url}
                              alt={`Photo for ${category.name}`}
                              className="w-full h-48 object-cover"
                            />
                            <div className="p-3 bg-gray-50">
                              <div className="font-medium text-sm">{participant?.name}</div>
                              <div className="text-xs text-gray-600 space-y-1">
                                {firstCount > 0 && (
                                  <div>1st place: {firstCount} vote{firstCount !== 1 ? 's' : ''}</div>
                                )}
                                {secondCount > 0 && (
                                  <div>2nd place: {secondCount} vote{secondCount !== 1 ? 's' : ''}</div>
                                )}
                                {firstCount === 0 && secondCount === 0 && (
                                  <div>No votes</div>
                                )}
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

