'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadContestResults, CategoryWinner } from '@/lib/contest-results-data';
import { getContestPhotosDownloadUrl } from '@/lib/photo-download';
import { Contest, Photo } from '@/types';
import { PageLoader } from '@/components/PageLoader';

type ContestResultsDisplayProps = {
  contest: Contest;
  contestId: string;
  backLink?: { href: string; label: string };
  subtitle?: string;
};

const downloadLinkClass =
  'inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-medium text-sm touch-manipulation min-h-[44px]';

const downloadLinkSecondaryClass =
  'inline-flex items-center justify-center px-4 py-2.5 bg-white text-blue-700 border-2 border-blue-200 rounded-lg hover:bg-blue-50 font-medium text-sm touch-manipulation min-h-[44px]';

export function ContestResultsDisplay({
  contest,
  contestId,
  backLink,
  subtitle,
}: ContestResultsDisplayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<Record<string, CategoryWinner[]>>({});
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, Photo[]>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    void loadContestResults(contest).then((data) => {
      setResults(data.results);
      setCategoryPhotos(data.categoryPhotos);
      setVoteCounts(data.voteCounts);
      setIsLoading(false);
    });
  }, [contest]);

  if (isLoading) {
    return <PageLoader message="Loading results..." />;
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          {backLink && (
            <Link href={backLink.href} className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              {backLink.label}
            </Link>
          )}
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Contest Results</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {subtitle ||
              `${contest.location} - ${new Date(contest.date + '-01').toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}`}
          </p>

          <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
            <a href={getContestPhotosDownloadUrl(contestId)} className={downloadLinkClass}>
              Download all photos (.zip)
            </a>
            <a
              href={getContestPhotosDownloadUrl(contestId, { scope: 'winners' })}
              className={downloadLinkSecondaryClass}
            >
              Download all winners (.zip)
            </a>
          </div>
        </div>

        <div className="space-y-8">
          {contest.categories.map((category) => {
            const winners = results[category.id] || [];
            const allPhotos = categoryPhotos[category.id] || [];
            const categoryVoteCounts = voteCounts[category.id] || {};
            const winningPhotoIds = new Set(winners.map((w) => w.photoId));

            return (
              <div key={category.id} className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">{category.name}</h2>

                {winners.length > 0 ? (
                  <div className="mb-6 space-y-6">
                    {winners.map((winner) => {
                      const winnerPhoto = allPhotos.find((p) => p.id === winner.photoId);
                      return (
                        <div key={winner.photoId}>
                          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 sm:p-6 mb-4">
                            <div className="text-sm text-yellow-800 mb-2">
                              🏆 {winners.length > 1 ? 'Winner (tie)' : 'Winner'}
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-yellow-900 mb-2">
                              {winner.participantName}
                            </div>
                            <div className="text-yellow-700">
                              {winner.votes} vote{winner.votes !== 1 ? 's' : ''}
                            </div>
                          </div>
                          {winnerPhoto && (
                            <>
                              <div className="relative w-full max-w-2xl">
                                <img
                                  src={winnerPhoto.url}
                                  alt={`Winner for ${category.name}`}
                                  className="w-full h-auto rounded-lg"
                                />
                              </div>
                              <a
                                href={getContestPhotosDownloadUrl(contestId, { photoId: winnerPhoto.id })}
                                className="inline-block mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 touch-manipulation min-h-[44px] leading-[44px]"
                              >
                                Download full size
                              </a>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 mb-4">No votes yet</p>
                )}

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    All submissions (most to fewest votes)
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allPhotos.map((photo, index) => {
                      const submitter = contest.participants.find((p) => p.id === photo.participantId);
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
                            alt={`Photo by ${submitter?.name || 'Unknown'} for ${category.name}`}
                            className="w-full h-48 object-cover"
                          />
                          <div className="p-3 bg-gray-50">
                            <div className="text-xs font-semibold text-gray-500 mb-1">#{index + 1}</div>
                            <div className="font-semibold text-sm text-gray-900">
                              Submitted by {submitter?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {voteCount > 0
                                ? `${voteCount} vote${voteCount !== 1 ? 's' : ''}`
                                : 'No votes'}
                            </div>
                            <a
                              href={getContestPhotosDownloadUrl(contestId, { photoId: photo.id })}
                              className="inline-block mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 touch-manipulation min-h-[36px] leading-9"
                            >
                              Download full size
                            </a>
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
  );
}
