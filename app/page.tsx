'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getContestsForUser, getContestsCreatedByUser, joinContestWithCode, lookupContestByJoinCode, getUser } from '@/lib/store';
import { clearPendingJoinCode, getPendingJoinCode, setPendingJoinCode } from '@/lib/join-code';
import { clearStoredUserId, getStoredUserId, hasLoggedInOnThisDevice } from '@/lib/auth-session';
import { touchUserActivity } from '@/lib/user-activity';
import { getContestCoverImage } from '@/lib/contest-cover-image';
import { canShowJoinCode, getContestStageInfo } from '@/lib/contest-status';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { PageLoader } from '@/components/PageLoader';
import { PhotoHuntFeatureRow, PhotoHuntLogo } from '@/components/PhotoHuntLogo';
import { ContactSupportLink } from '@/components/ContactSupportLink';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userContests, setUserContests] = useState<any[]>([]);
  const [createdContests, setCreatedContests] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Please wait...');
  const [isLoadingContests, setIsLoadingContests] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [codePreview, setCodePreview] = useState<{ location: string; date: string } | null>(null);
  const [codeLookupError, setCodeLookupError] = useState('');
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [showJoinCodeForm, setShowJoinCodeForm] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      void (async () => {
        try {
          const returning = hasLoggedInOnThisDevice();
          setIsReturningUser(returning);
          setShowJoinCodeForm(!returning || searchParams.get('join') === '1');

          const codeFromUrl = searchParams.get('code');
          const codeFromStorage = getPendingJoinCode();
          const initialCode = (codeFromUrl || codeFromStorage || '').toUpperCase().trim();
          if (initialCode) {
            setJoinCode(initialCode);
            setPendingJoinCode(initialCode);
          }

          const storedUserId = getStoredUserId();
          if (storedUserId) {
            setUserId(storedUserId);
            setIsLoggedIn(true);
            touchUserActivity(storedUserId);
            setIsLoadingContests(true);
            await loadUserInfo(storedUserId);
            await loadUserContests(storedUserId);

            if (initialCode) {
              const joined = await tryJoinAndRedirect(storedUserId, initialCode, { silent: true });
              if (joined) return;
            }

            setIsLoadingContests(false);
          }
        } catch (error) {
          console.error('Error reading stored login:', error);
          setIsLoadingContests(false);
        }
      })();
    }
  }, [searchParams]);

  useEffect(() => {
    const normalized = joinCode.toUpperCase().trim();

    if (normalized.length !== 4) {
      setCodePreview(null);
      setCodeLookupError('');
      return;
    }

    if (typeof window !== 'undefined') {
      setPendingJoinCode(normalized);
    }

    const timeout = setTimeout(async () => {
      const result = await lookupContestByJoinCode(normalized);
      if ('contest' in result && result.contest) {
        setCodePreview({ location: result.contest.location, date: result.contest.date });
        setCodeLookupError('');
      } else {
        setCodePreview(null);
        setCodeLookupError(
          'error' in result ? result.error : 'Invalid contest code. Please check and try again.'
        );
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [joinCode]);

  const loadUserInfo = async (uid: string) => {
    try {
      const user = await getUser(uid);
      if (user) {
        setUserName(user.name);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const loadUserContests = async (uid: string) => {
    try {
      console.log('Loading contests for user:', uid);
      const [joinedContests, created] = await Promise.all([
        getContestsForUser(uid).catch(err => {
          console.error('Error loading joined contests:', err);
          return [];
        }),
        getContestsCreatedByUser(uid).catch(err => {
          console.error('Error loading created contests:', err);
          return [];
        }),
      ]);
      console.log('Loaded contests - joined:', joinedContests?.length || 0, 'created:', created?.length || 0);
      setUserContests(joinedContests || []);
      setCreatedContests(created || []);
    } catch (error) {
      console.error('Error loading contests:', error);
      setUserContests([]);
      setCreatedContests([]);
    }
  };

  const tryJoinAndRedirect = async (
    uid: string,
    code: string,
    options?: { silent?: boolean }
  ): Promise<boolean> => {
    const normalized = code.toUpperCase().trim();
    if (!normalized || normalized.length !== 4) {
      return false;
    }

    if (!options?.silent) {
      setLoadingMessage('Joining contest...');
      setLoading(true);
    }

    try {
      const participant = await joinContestWithCode(uid, normalized);
      clearPendingJoinCode();
      setJoinCode('');
      setCodePreview(null);
      setCodeLookupError('');
      router.push(`/contest/${participant.contestId}`);
      return true;
    } catch (err: any) {
      if (!options?.silent) {
        setError(err.message || 'Failed to join contest. Please check your code.');
      }
      return false;
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  const handleContinueWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = joinCode.toUpperCase().trim();

    if (normalized.length !== 4) {
      setError('Please enter a 4-character contest code');
      return;
    }

    setLoadingMessage('Checking code...');
    setLoading(true);

    try {
      const result = await lookupContestByJoinCode(normalized);
      if ('contest' in result && result.contest) {
        setPendingJoinCode(normalized);
        router.push('/login');
        return;
      }
      setError(
        'error' in result ? result.error : 'Invalid contest code. Please check and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinContest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoadingMessage('Joining contest...');
    setLoading(true);

    if (!joinCode.trim() || !userId) {
      setError('Please enter a join code');
      setLoading(false);
      return;
    }

    try {
      const participant = await joinContestWithCode(userId, joinCode);
      clearPendingJoinCode();
      await loadUserContests(userId);
      setJoinCode('');
      setError('');
      router.push(`/contest/${participant.contestId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join contest. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredUserId();
    setIsLoggedIn(false);
    setUserId(null);
    setUserName('');
    setUserContests([]);
    setCreatedContests([]);
    setShowUserMenu(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // The useEffect will restore login from localStorage after mount

  if (isLoggedIn && userId) {
    if (isLoadingContests) {
      return <PageLoader message="Loading your contests..." />;
    }

    const hasExistingContests = userContests.length > 0 || createdContests.length > 0;

    const joinContestForm = (compact: boolean) => (
      <div
        className={
          compact
            ? 'mb-6 bg-white rounded-lg shadow-sm p-5 sm:p-6 border border-gray-200'
            : 'mb-8 bg-white rounded-xl shadow-lg p-6 sm:p-8 border-2 border-blue-200'
        }
      >
        <h2
          className={
            compact
              ? 'text-base font-semibold text-gray-800 mb-1'
              : 'text-xl sm:text-2xl font-bold text-gray-900 mb-1 text-center'
          }
        >
          Have a 4 digit contest code?
        </h2>
        <p
          className={
            compact
              ? 'text-sm text-gray-500 mb-4'
              : 'text-sm sm:text-base text-gray-600 mb-6 text-center'
          }
        >
          {compact
            ? 'Enter a code to join another contest'
            : 'Enter it here to join a contest someone invited you to'}
        </p>
        <form onSubmit={handleJoinContest}>
          <div className={compact ? 'mb-3' : 'mb-4'}>
            <label htmlFor="join-code" className="sr-only">
              Contest code
            </label>
            <input
              id="join-code"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              maxLength={4}
              className={
                compact
                  ? 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-xl font-mono tracking-[0.25em] touch-manipulation text-gray-900 font-bold'
                  : 'w-full px-4 py-4 sm:py-5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl sm:text-3xl font-mono tracking-[0.3em] touch-manipulation text-gray-900 font-bold'
              }
              required
              autoFocus={!hasExistingContests}
              disabled={loading}
              inputMode="text"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={
              compact
                ? 'w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-sm touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed'
                : 'w-full bg-blue-600 text-white py-3 sm:py-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-semibold text-base sm:text-lg touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed'
            }
          >
            {loading ? 'Joining...' : 'Join Contest'}
          </button>
        </form>
      </div>
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <LoadingOverlay show={loading} message={loadingMessage} />
        {/* User Avatar in top right corner */}
        <div className="relative">
          <div className="absolute top-4 right-4 z-10">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {userName ? getInitials(userName) : 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {userName || 'User'}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-20">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{userName || 'User'}</p>
                    </div>
                    <Link
                      href="/help/participants"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Help guide
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-200"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 sm:py-16">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}!
              </h1>
              <p className="text-base sm:text-lg text-gray-600">
                {hasExistingContests
                  ? 'Pick up where you left off'
                  : 'Join a photo contest to get started'}
              </p>
            </div>

            {hasExistingContests ? (
              <>
                {userContests.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Your Contests</h2>
                    <div className="space-y-4">
                      {userContests.map((contest) => {
                        const stage = getContestStageInfo(contest.status);

                        return (
                        <button
                          key={contest.id}
                          onClick={() => router.push(`/contest/${contest.id}`)}
                          className="w-full text-left p-6 sm:p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-blue-400 active:scale-98 touch-manipulation relative overflow-hidden group"
                        >
                          <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                            style={{
                              backgroundImage: `url(${getContestCoverImage(contest)})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                            }}
                          />
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10"
                            aria-hidden="true"
                          />
                          <div className="relative z-10 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0 px-1">
                              <div className="font-bold text-xl sm:text-2xl text-white mb-1 truncate [text-shadow:0_2px_12px_rgba(0,0,0,0.9),0_0_3px_rgba(0,0,0,0.8)]">
                                {contest.location}
                              </div>
                              <div className="text-base sm:text-lg text-white font-medium [text-shadow:0_1px_8px_rgba(0,0,0,0.9),0_0_2px_rgba(0,0,0,0.8)]">
                                {new Date(contest.date + '-01').toLocaleDateString('en-US', {
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="mt-2">
                                <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${stage.badgeClasses}`}>
                                  {stage.shortLabel}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 text-white text-2xl sm:text-3xl font-bold [text-shadow:0_2px_8px_rgba(0,0,0,0.9)] group-hover:translate-x-1 transition-transform pr-1">
                              →
                            </div>
                          </div>
                        </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {createdContests.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Contests you&apos;re organizing</h2>
                    <div className="space-y-3">
                      {createdContests.map((contest) => {
                        const stage = getContestStageInfo(contest.status);

                        return (
                        <div
                          key={contest.id}
                          className="bg-white rounded-lg shadow-md border border-gray-200 hover:border-green-300 transition-shadow overflow-hidden"
                        >
                          <button
                            onClick={() => router.push(`/admin/contest/${contest.id}`)}
                            className="w-full text-left p-4 sm:p-5 hover:bg-gray-50 active:scale-98 touch-manipulation"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-semibold text-base sm:text-lg text-gray-900 mb-1">{contest.location}</div>
                                <div className="text-xs sm:text-sm text-gray-600 mb-2">
                                  {new Date(contest.date + '-01').toLocaleDateString('en-US', {
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div className="mb-2">
                                  <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${stage.badgeClasses}`}>
                                    {stage.label}
                                  </span>
                                </div>
                                {canShowJoinCode(contest.status) && (
                                  <div className="text-xs text-gray-500">
                                    Join Code: <span className="font-mono font-bold">{contest.joinCode}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                          <div className="border-t border-gray-100 px-4 py-2.5 sm:px-5 bg-gray-50">
                            <button
                              type="button"
                              onClick={() => router.push(`/contest/${contest.id}`)}
                              className="text-sm font-medium text-indigo-700 hover:text-indigo-900 touch-manipulation min-h-[36px]"
                            >
                              View as participant →
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {joinContestForm(true)}
              </>
            ) : (
              joinContestForm(false)
            )}

            <div className="text-center pt-2 pb-4">
              <p className="text-sm text-gray-500 mb-2">Running your own contest?</p>
              <Link
                href="/admin"
                className="text-sm text-gray-600 hover:text-blue-700 underline underline-offset-2 touch-manipulation"
              >
                Create or manage a contest
              </Link>
              <p className="mt-4 text-sm text-gray-500">
                Questions? <ContactSupportLink className="text-gray-600 hover:text-blue-800 underline underline-offset-2">Contact us</ContactSupportLink>
              </p>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600 flex items-center justify-center p-4 relative overflow-hidden">
      <LoadingOverlay show={loading} message={loadingMessage} />
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating landmark photos */}
        <div 
          className="absolute top-20 left-10 w-24 h-24 sm:w-32 sm:h-32 rounded-lg shadow-2xl opacity-30 hover:opacity-50 transition-opacity animate-bounce"
          style={{ 
            animationDuration: '6s', 
            animationDelay: '0s',
            backgroundImage: 'url(https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300&h=300&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div 
          className="absolute top-40 right-20 w-20 h-20 sm:w-28 sm:h-28 rounded-lg shadow-2xl opacity-30 hover:opacity-50 transition-opacity animate-bounce"
          style={{ 
            animationDuration: '7s', 
            animationDelay: '1s',
            backgroundImage: 'url(https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=300&h=300&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div 
          className="absolute bottom-32 left-20 w-28 h-28 sm:w-36 sm:h-36 rounded-lg shadow-2xl opacity-30 hover:opacity-50 transition-opacity animate-bounce"
          style={{ 
            animationDuration: '6.5s', 
            animationDelay: '2s',
            backgroundImage: 'url(https://images.unsplash.com/photo-1529260830199-42c24126f198?w=300&h=300&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div 
          className="absolute bottom-20 right-16 w-24 h-24 sm:w-32 sm:h-32 rounded-lg shadow-2xl opacity-30 hover:opacity-50 transition-opacity animate-bounce"
          style={{ 
            animationDuration: '7.5s', 
            animationDelay: '0.5s',
            backgroundImage: 'url(https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=300&h=300&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div 
          className="absolute top-1/2 left-1/4 w-22 h-22 sm:w-30 sm:h-30 rounded-lg shadow-2xl opacity-30 hover:opacity-50 transition-opacity animate-bounce"
          style={{ 
            animationDuration: '6.8s', 
            animationDelay: '1.5s',
            backgroundImage: 'url(https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=300&h=300&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div 
          className="absolute top-1/3 right-1/3 w-20 h-20 sm:w-26 sm:h-26 rounded-lg shadow-2xl opacity-30 hover:opacity-50 transition-opacity animate-bounce"
          style={{ 
            animationDuration: '7.2s', 
            animationDelay: '2.5s',
            backgroundImage: 'url(https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=300&h=300&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div 
          className="absolute top-1/4 right-1/5 w-18 h-18 sm:w-24 sm:h-24 rounded-lg shadow-2xl opacity-30 hover:opacity-50 transition-opacity animate-bounce"
          style={{ 
            animationDuration: '6.3s', 
            animationDelay: '3s',
            backgroundImage: 'url(https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=300&h=300&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div 
          className="absolute bottom-1/3 left-1/3 w-26 h-26 sm:w-34 sm:h-34 rounded-lg shadow-2xl opacity-30 hover:opacity-50 transition-opacity animate-bounce"
          style={{ 
            animationDuration: '7.3s', 
            animationDelay: '1.2s',
            backgroundImage: 'url(https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=300&h=300&fit=crop&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        
        {/* Floating shapes for depth */}
        <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-yellow-300 rounded-full opacity-10 blur-2xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-pink-300 rounded-full opacity-10 blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/5 w-36 h-36 bg-cyan-300 rounded-full opacity-10 blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 border-2 border-white/50">
        <div className="text-center mb-6 sm:mb-8">
          <PhotoHuntLogo className="mb-5" />

          {isReturningUser ? (
            <>
              <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
                Welcome back!
              </p>
              <p className="text-sm text-gray-600">
                {codePreview
                  ? `Sign in to join ${codePreview.location}. You don't need to enter the code again.`
                  : 'Sign in to see your contests. No join code needed if you already joined one.'}
              </p>
            </>
          ) : (
            <>
              <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
                Ready to play? Enter your contest code to get started.
              </p>
              <p className="text-sm text-gray-600">
                {joinCode.trim().length === 4 && codePreview
                  ? `Join ${codePreview.location} — log in or create an account on the next screen.`
                  : 'Upload, rank, and vote on the best photos from your group.'}
              </p>
            </>
          )}

          <PhotoHuntFeatureRow className="mt-5" />
        </div>

        {isReturningUser ? (
          <>
            {codePreview && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm text-center">
                Contest ready: <strong>{codePreview.location}</strong>
                {' · '}
                {new Date(codePreview.date + '-01').toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            )}

            <Link
              href="/login"
              className="block w-full text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-3 sm:py-4 rounded-lg hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all font-bold text-base sm:text-lg touch-manipulation min-h-[44px] shadow-lg hover:shadow-xl leading-[44px] sm:leading-normal"
            >
              Log in
            </Link>

            <div className="mt-6 pt-6 border-t border-gray-200">
              {!showJoinCodeForm ? (
                <button
                  type="button"
                  onClick={() => setShowJoinCodeForm(true)}
                  className="w-full text-sm text-blue-700 font-medium hover:text-blue-900 min-h-[44px]"
                >
                  Joining a new contest? Enter a code
                </button>
              ) : (
                <form onSubmit={handleContinueWithCode}>
                  <h2 className="text-base font-semibold text-gray-900 mb-1 text-center">
                    Join a different contest
                  </h2>
                  <p className="text-sm text-gray-600 mb-3 text-center">
                    Enter a new 4-character code, then sign in.
                  </p>
                  <label htmlFor="returning-join-code" className="sr-only">
                    Contest code
                  </label>
                  <input
                    id="returning-join-code"
                    type="text"
                    value={joinCode}
                    onChange={(e) => {
                      const next = e.target.value.toUpperCase();
                      setJoinCode(next);
                      if (next.trim()) {
                        setPendingJoinCode(next.trim());
                      } else {
                        clearPendingJoinCode();
                      }
                    }}
                    placeholder="ABCD"
                    maxLength={4}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-xl font-mono tracking-[0.25em] text-gray-900 font-bold"
                    disabled={loading}
                    inputMode="text"
                    autoComplete="off"
                  />
                  {codeLookupError && joinCode.trim().length === 4 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm text-center">
                      {codeLookupError}
                    </div>
                  )}
                  {error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading || joinCode.trim().length !== 4}
                    className="w-full mt-3 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm min-h-[44px] disabled:opacity-50"
                  >
                    {loading ? 'Checking code...' : 'Continue to log in'}
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
        <form onSubmit={handleContinueWithCode}>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 text-center">
            Have a 4 digit contest code?
          </h2>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Enter it here, then continue to log in or create an account.
          </p>
          <label htmlFor="login-join-code" className="sr-only">
            Contest code
          </label>
          <input
            id="login-join-code"
            type="text"
            value={joinCode}
            onChange={(e) => {
              const next = e.target.value.toUpperCase();
              setJoinCode(next);
              if (next.trim()) {
                setPendingJoinCode(next.trim());
              } else {
                clearPendingJoinCode();
              }
            }}
            placeholder="ABCD"
            maxLength={4}
            className="w-full px-4 py-4 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl font-mono tracking-[0.3em] touch-manipulation text-gray-900 font-bold"
            disabled={loading}
            inputMode="text"
            autoComplete="off"
            autoFocus
          />
          {codePreview && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm text-center">
              Contest found: <strong>{codePreview.location}</strong>
              {' · '}
              {new Date(codePreview.date + '-01').toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </div>
          )}
          {codeLookupError && joinCode.trim().length === 4 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm text-center">
              {codeLookupError}
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || joinCode.trim().length !== 4}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-3 sm:py-4 rounded-lg hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 transition-all font-bold text-base sm:text-lg touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? 'Checking code...' : 'Continue'}
          </button>
        </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 text-center space-y-3">
          {!isReturningUser && (
            <>
              <p className="text-sm text-gray-600">Already have an account?</p>
              <Link
                href="/login"
                className="inline-block w-full py-2.5 rounded-lg border-2 border-blue-200 text-blue-700 font-medium hover:bg-blue-50 transition-colors min-h-[44px] leading-[44px]"
              >
                Log in
              </Link>
            </>
          )}
          <Link
            href="/login?register=1"
            className="block text-sm text-blue-600 hover:text-blue-800 touch-manipulation min-h-[44px]"
          >
            {isReturningUser ? 'Need a new account? Create one' : "Don't have an account? Create one"}
          </Link>
          <Link
            href="/admin"
            className="block text-sm text-gray-500 hover:text-gray-700 pt-2 touch-manipulation"
          >
            Create or manage a contest
          </Link>
          <Link
            href="/help"
            className="block text-sm text-gray-500 hover:text-gray-700 pt-2 touch-manipulation"
          >
            Help guide
          </Link>
          <p className="pt-2 text-sm text-gray-500">
            Questions? <ContactSupportLink className="text-gray-500 hover:text-gray-700">Contact us</ContactSupportLink>
          </p>
        </div>

      </div>

      <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm z-10">
        <Link href="/help" className="hover:text-white underline underline-offset-2">
          Help
        </Link>
        {' · '}
        <ContactSupportLink className="text-white/80 hover:text-white underline underline-offset-2">
          Contact
        </ContactSupportLink>
        {' · '}
        Version 1.1
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<PageLoader message="Loading..." />}>
      <HomeContent />
    </Suspense>
  );
}
