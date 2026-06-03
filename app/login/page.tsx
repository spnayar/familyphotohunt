'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  registerUser,
  loginUser,
  joinContestWithCode,
  lookupContestByJoinCode,
} from '@/lib/store';
import {
  clearPendingJoinCode,
  getPendingJoinCode,
  setPendingJoinCode,
} from '@/lib/join-code';
import { getStoredUserId, setStoredUserId } from '@/lib/auth-session';
import { touchUserActivity } from '@/lib/user-activity';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { PageLoader } from '@/components/PageLoader';
import { PasswordInput } from '@/components/PasswordInput';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Please wait...');
  const [codePreview, setCodePreview] = useState<{ location: string; date: string } | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const registerParam = searchParams.get('register');
    if (registerParam === '1' || registerParam === 'true') {
      setIsRegistering(true);
    }

    const codeFromUrl = searchParams.get('code');
    const codeFromStorage = getPendingJoinCode();
    const initialCode = (codeFromUrl || codeFromStorage || '').toUpperCase().trim();
    if (initialCode) {
      setJoinCode(initialCode);
      setPendingJoinCode(initialCode);
    }

    const storedUserId = getStoredUserId();
    if (storedUserId && initialCode) {
      void tryJoinAndRedirect(storedUserId, initialCode).finally(() => {
        setIsCheckingSession(false);
      });
      return;
    }

    if (storedUserId) {
      router.replace('/');
      return;
    }

    setIsCheckingSession(false);
  }, [searchParams, router]);

  useEffect(() => {
    const normalized = joinCode.toUpperCase().trim();
    if (normalized.length !== 4) {
      setCodePreview(null);
      return;
    }

    setPendingJoinCode(normalized);

    const timeout = setTimeout(async () => {
      const result = await lookupContestByJoinCode(normalized);
      if ('contest' in result && result.contest) {
        setCodePreview({ location: result.contest.location, date: result.contest.date });
      } else {
        setCodePreview(null);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [joinCode]);

  const tryJoinAndRedirect = async (uid: string, code: string): Promise<boolean> => {
    const normalized = code.toUpperCase().trim();
    if (!normalized || normalized.length !== 4) {
      return false;
    }

    setLoadingMessage('Joining contest...');
    setLoading(true);

    try {
      const participant = await joinContestWithCode(uid, normalized);
      clearPendingJoinCode();
      router.push(`/contest/${participant.contestId}`);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to join contest. Please check your code.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoadingMessage('Creating account...');
    setLoading(true);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const user = await registerUser(email, password, name);
      setStoredUserId(user.id);
      touchUserActivity(user.id);

      if (joinCode.trim()) {
        const joined = await tryJoinAndRedirect(user.id, joinCode);
        if (joined) return;
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoadingMessage('Logging in...');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }

    try {
      const user = await loginUser(email, password);
      if (!user) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      setStoredUserId(user.id);
      touchUserActivity(user.id);

      if (joinCode.trim()) {
        const joined = await tryJoinAndRedirect(user.id, joinCode);
        if (joined) return;
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingSession) {
    return <PageLoader message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600 flex items-center justify-center p-4 relative overflow-hidden">
      <LoadingOverlay show={loading} message={loadingMessage} />

      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 border-2 border-white/50">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-4xl">📷</span>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {isRegistering ? 'Create your account' : 'Log in'}
            </h1>
          </div>
          {codePreview ? (
            <p className="text-sm text-gray-600">
              Join <strong>{codePreview.location}</strong>
              {' · '}
              {new Date(codePreview.date + '-01').toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          ) : joinCode.trim().length === 4 ? (
            <p className="text-sm text-amber-700">Check your contest code and try again from the home page.</p>
          ) : (
            <p className="text-sm text-gray-600">
              {isRegistering
                ? 'Create an account to join your contest.'
                : 'Sign in to continue to your contest.'}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {isRegistering ? (
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2 text-sm">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                required
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2 text-sm">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                required
                disabled={loading}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="register-password" className="block text-gray-700 font-medium mb-2 text-sm">
                Password
              </label>
              <PasswordInput
                id="register-password"
                value={password}
                onChange={setPassword}
                placeholder="At least 6 characters"
                required
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold mb-3 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Creating account...' : joinCode.trim() ? 'Create account & join' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError('');
              }}
              disabled={loading}
              className="w-full text-blue-600 hover:text-blue-800 text-sm min-h-[44px]"
            >
              Already have an account? Log in
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2 text-sm">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                required
                autoFocus
                disabled={loading}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="login-password" className="block text-gray-700 font-medium mb-2 text-sm">
                Password
              </label>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={setPassword}
                placeholder="Your password"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold mb-3 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? 'Logging in...' : joinCode.trim() ? 'Log in & join' : 'Log in'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setError('');
              }}
              disabled={loading}
              className="w-full text-blue-600 hover:text-blue-800 text-sm min-h-[44px]"
            >
              Don&apos;t have an account? Create one
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 text-center space-y-3">
          <Link href="/" className="text-sm text-gray-600 hover:text-blue-700">
            ← Back to enter a different code
          </Link>
          <Link href="/help/participants" className="block text-sm text-gray-600 hover:text-blue-700">
            Help guide for participants
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading..." />}>
      <LoginContent />
    </Suspense>
  );
}
