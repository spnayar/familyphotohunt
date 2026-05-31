'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { PageLoader } from '@/components/PageLoader';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return <PageLoader message="Redirecting..." />;
}
