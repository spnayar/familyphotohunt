'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser, loginUser, getContestsForUser, getContestsCreatedByUser, joinContestWithCode, getUser } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userContests, setUserContests] = useState<any[]>([]);
  const [createdContests, setCreatedContests] = useState<any[]>([]);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Set mounted immediately
    setMounted(true);
    
    // Check for existing session
    if (typeof window !== 'undefined') {
      try {
        const storedUserId = sessionStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          setIsLoggedIn(true);
          loadUserInfo(storedUserId);
          loadUserContests(storedUserId);
        }
      } catch (error) {
        console.error('Error reading sessionStorage:', error);
      }
    }
  }, []);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userId', user.id);
      }
      setUserId(user.id);
      setIsLoggedIn(true);
      setUserName(user.name);
      setShowJoinForm(false);
      setError('');
      await loadUserContests(user.id);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting login for:', email);
      const user = await loginUser(email, password);
      console.log('Login response:', user);
      if (user) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('userId', user.id);
          console.log('Stored userId in sessionStorage:', user.id);
        }
        setUserId(user.id);
        setIsLoggedIn(true);
        setUserName(user.name);
        await loadUserContests(user.id);
        setError('');
      } else {
        console.log('Login failed: user is null');
        setError('Invalid email or password');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinContest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!joinCode.trim() || !userId) {
      setError('Please enter a join code');
      setLoading(false);
      return;
    }

    try {
      const participant = await joinContestWithCode(userId, joinCode);
      await loadUserContests(userId);
      setJoinCode('');
      setShowJoinForm(false);
      setError('');
      router.push(`/contest/${participant.contestId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join contest. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('userId');
    }
    setIsLoggedIn(false);
    setUserId(null);
    setUserName('');
    setUserContests([]);
    setCreatedContests([]);
    setEmail('');
    setPassword('');
    setName('');
    setShowJoinForm(false);
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

  const getLocationImage = (location: string): string => {
    // Normalize location name (remove common suffixes, convert to lowercase)
    const normalized = location.toLowerCase().trim();
    
    // Map common location names to specific Unsplash image IDs or queries
    // Using Unsplash's API with specific photo IDs for better reliability
    const locationMap: Record<string, string> = {
      'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80',
      'london': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80',
      'new york': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80',
      'tokyo': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80',
      'rome': 'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800&h=600&fit=crop&q=80',
      'barcelona': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop&q=80',
      'amsterdam': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop&q=80',
      'dubai': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80',
      'sydney': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80',
      'san francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop&q=80',
      'los angeles': 'https://images.unsplash.com/photo-1515896578789-8d0cb4840cc5?w=800&h=600&fit=crop&q=80',
      'chicago': 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&h=600&fit=crop&q=80',
      'miami': 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=800&h=600&fit=crop&q=80',
      'boston': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&h=600&fit=crop&q=80',
      'seattle': 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&h=600&fit=crop&q=80',
      'vancouver': 'https://images.unsplash.com/photo-1559511260-66a654ae982a?w=800&h=600&fit=crop&q=80',
      'toronto': 'https://images.unsplash.com/photo-1517935706615-2717063c2225?w=800&h=600&fit=crop&q=80',
      'venice': 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=800&h=600&fit=crop&q=80',
      'florence': 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?w=800&h=600&fit=crop&q=80',
      'athens': 'https://images.unsplash.com/photo-1604999333679-b86d54738315?w=800&h=600&fit=crop&q=80',
      'istanbul': 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=600&fit=crop&q=80',
      'cairo': 'https://images.unsplash.com/photo-1539650116574-75c0c6d73a6e?w=800&h=600&fit=crop&q=80',
      'rio de janeiro': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&h=600&fit=crop&q=80',
      'machu picchu': 'https://images.unsplash.com/photo-1587595431973-160d0d94a21d?w=800&h=600&fit=crop&q=80',
      'santorini': 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&h=600&fit=crop&q=80',
      'bali': 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&h=600&fit=crop&q=80',
      'thailand': 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&h=600&fit=crop&q=80',
    };

    // Check if we have a direct match
    if (locationMap[normalized]) {
      return locationMap[normalized];
    }

    // Check for partial matches (e.g., "Paris Trip" contains "paris")
    for (const [key, imageUrl] of Object.entries(locationMap)) {
      if (normalized.includes(key)) {
        return imageUrl;
      }
    }

    // Default: use Unsplash search API with the location name
    const searchQuery = encodeURIComponent(location);
    return `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80&auto=format`;
  };

  // Always render the form - don't wait for mounted
  // The useEffect will handle sessionStorage after mount

  if (isLoggedIn && userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
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
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Welcome to Family Photo Hunt
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 mb-6">
                Upload and manage your photos for contests
              </p>
            </div>

            {/* Contests You've Joined - Most Prominent */}
            {userContests.length > 0 ? (
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Your Contests</h2>
                <div className="space-y-4">
                  {userContests.map((contest) => (
                    <button
                      key={contest.id}
                      onClick={() => router.push(`/contest/${contest.id}`)}
                      className="w-full text-left p-6 sm:p-8 rounded-xl shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-blue-400 active:scale-98 touch-manipulation relative overflow-hidden group"
                    >
                      {/* Background Image */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                        style={{
                          backgroundImage: `url(${getLocationImage(contest.location)})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        {/* Dark overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/50"></div>
                      </div>
                      {/* Fallback background color in case image doesn't load */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 -z-10"></div>
                      
                      {/* Content */}
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-xl sm:text-2xl text-white mb-2 drop-shadow-lg">{contest.location}</div>
                          <div className="text-base sm:text-lg text-white/90 drop-shadow-md">
                            {new Date(contest.date + '-01').toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                        <div className="text-white text-2xl sm:text-3xl font-bold drop-shadow-lg group-hover:translate-x-2 transition-transform">
                          →
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-8 text-center">
                <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                  <p className="text-lg text-gray-700 mb-4">You haven't joined any contests yet.</p>
                  <p className="text-sm text-gray-600">Join a contest using a code below or create a new one.</p>
                </div>
              </div>
            )}

            {/* Contests You Created - Less Prominent */}
            {createdContests.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">Contests You Created</h2>
                <div className="space-y-3">
                  {createdContests.map((contest) => (
                    <button
                      key={contest.id}
                      onClick={() => router.push(`/admin/contest/${contest.id}`)}
                      className="w-full text-left p-4 sm:p-5 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 hover:border-green-300 active:scale-98 touch-manipulation"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-base sm:text-lg text-gray-900 mb-1">{contest.location}</div>
                          <div className="text-xs sm:text-sm text-gray-600 mb-1">
                            {new Date(contest.date + '-01').toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            Join Code: <span className="font-mono font-bold">{contest.joinCode}</span>
                          </div>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {contest.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 space-y-4">
              <button
                onClick={() => router.push('/admin')}
                className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors font-medium text-base sm:text-lg touch-manipulation min-h-[44px]"
              >
                Manage Contests
              </button>
              
              {showJoinForm ? (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Join a Contest</h2>
                  <form onSubmit={handleJoinContest}>
                    <div className="mb-4">
                      <label className="block text-gray-700 font-medium mb-2 text-sm sm:text-base">
                        Enter Contest Code
                      </label>
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="ABCD"
                        maxLength={4}
                        className="w-full px-4 py-3 sm:py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl sm:text-2xl font-mono tracking-widest touch-manipulation text-gray-900 font-bold"
                        required
                        autoFocus
                        disabled={loading}
                      />
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Enter the 4-digit code shared by the contest organizer
                      </p>
                    </div>

                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white py-3 sm:py-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-base sm:text-lg touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Joining...' : 'Join Contest'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowJoinForm(false);
                          setJoinCode('');
                          setError('');
                        }}
                        disabled={loading}
                        className="px-6 bg-gray-200 text-gray-700 py-3 sm:py-4 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors font-medium text-base sm:text-lg touch-manipulation min-h-[44px] disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  onClick={() => setShowJoinForm(true)}
                  className="w-full bg-blue-600 text-white py-3 sm:py-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-base sm:text-lg touch-manipulation min-h-[44px]"
                >
                  + Join a Contest
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-purple-600 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating vacation photos of famous landmarks */}
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
          {/* Fun header with icons */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-5xl sm:text-6xl">📷</span>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent" style={{ fontFamily: 'Georgia, serif' }}>
              Family Photo Hunt
            </h1>
            <span className="text-5xl sm:text-6xl">🏆</span>
          </div>
          
          <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
            {isRegistering 
              ? '🎮 Join the fun! Create your account and start competing' 
              : '🎯 Ready to play? Log in and show off your vacation photos!'}
          </p>
          <p className="text-sm text-gray-600">
            {isRegistering 
              ? 'Share your best travel moments and compete for the win!' 
              : 'Upload, rank, and vote on amazing vacation photos'}
          </p>
          
          {/* Fun feature highlights */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span>📸</span>
              <span>Upload</span>
            </div>
            <div className="flex items-center gap-1">
              <span>⭐</span>
              <span>Rank</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🏆</span>
              <span>Win</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {isRegistering ? (
          <form onSubmit={handleRegister}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2 text-sm sm:text-base">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 touch-manipulation text-gray-900 text-base sm:text-lg transition-all"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2 text-sm sm:text-base">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 touch-manipulation text-gray-900 text-base sm:text-lg transition-all"
                required
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2 text-sm sm:text-base">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 touch-manipulation text-gray-900 text-base sm:text-lg transition-all"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-3 sm:py-4 rounded-lg hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 active:scale-98 transition-all font-bold text-base sm:text-lg touch-manipulation min-h-[44px] mb-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Creating Account...' : '🚀 Start Playing!'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError('');
              }}
              disabled={loading}
              className="w-full text-blue-600 hover:text-blue-800 text-sm sm:text-base touch-manipulation min-h-[44px] disabled:opacity-50"
            >
              Already have an account? Log in
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2 text-sm sm:text-base">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 touch-manipulation text-gray-900 text-base sm:text-lg transition-all"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-medium mb-2 text-sm sm:text-base">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-4 py-3 sm:py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 touch-manipulation text-gray-900 text-base sm:text-lg transition-all"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-3 sm:py-4 rounded-lg hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 active:scale-98 transition-all font-bold text-base sm:text-lg touch-manipulation min-h-[44px] mb-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Logging in...' : '🎮 Let\'s Play!'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setError('');
              }}
              disabled={loading}
              className="w-full text-blue-600 hover:text-blue-800 text-sm sm:text-base touch-manipulation min-h-[44px] disabled:opacity-50"
            >
              Don't have an account? Create one
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
