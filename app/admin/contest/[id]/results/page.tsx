'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContest } from '@/lib/store';
import { Contest } from '@/types';
import { PageLoader } from '@/components/PageLoader';
import { ContestResultsDisplay } from '@/components/ContestResultsDisplay';
import { getStoredUserId } from '@/lib/auth-session';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.id as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
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
    };
    loadResults();
  }, [contestId, router]);

  if (isLoading || !contest) {
    return <PageLoader message="Loading results..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <ContestResultsDisplay
        contest={contest}
        contestId={contestId}
        backLink={{ href: `/admin/contest/${contestId}`, label: '← Back to Contest' }}
      />
    </div>
  );
}
