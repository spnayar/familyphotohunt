'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { PageLoader } from '@/components/PageLoader';

function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(query ? `/?${query}` : '/');
  }, [router, searchParams]);

  return <PageLoader message="Redirecting..." />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader message="Redirecting..." />}>
      <LoginRedirect />
    </Suspense>
  );
}
