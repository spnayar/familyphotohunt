'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAllContests, createContest, deleteContest, getContestsCreatedByUser } from '@/lib/store';
import { Contest } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [contests, setContests] = useState<Contest[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    location: '',
    date: '',
  });

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadContests = async () => {
      const storedUserId = sessionStorage.getItem('userId');
      
      if (!storedUserId) {
        router.push('/');
        return;
      }

      setUserId(storedUserId);
      setIsLoading(false);
      // Only load contests created by this user
      const loadedContests = await getContestsCreatedByUser(storedUserId);
      setContests(loadedContests);
    };
    
    loadContests();
  }, [router]);

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location || !formData.date) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const storedUserId = sessionStorage.getItem('userId');
      const newContest = await createContest({
        location: formData.location,
        date: formData.date,
        categories: [],
        participants: [],
        status: 'draft',
        creatorId: storedUserId || undefined,
      });

      if (storedUserId) {
        const updatedContests = await getContestsCreatedByUser(storedUserId);
        setContests(updatedContests);
      }
      setFormData({ location: '', date: '' });
      setShowCreateForm(false);
      
      // Show the join code to the admin
      alert(`Contest created successfully!\n\nJoin Code: ${newContest.joinCode}\n\nShare this code with participants so they can join the contest.`);
    } catch (error: any) {
      alert(`Failed to create contest: ${error.message}`);
    }
  };

  const handleDeleteContest = async (contestId: string, contestLocation: string) => {
    if (!confirm(`Are you sure you want to delete the contest "${contestLocation}"?\n\nThis will permanently delete:\n- The contest\n- All categories\n- All participants\n- All photos\n- All votes\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const success = await deleteContest(contestId);
      if (success) {
        const updatedContests = await getAllContests();
        setContests(updatedContests);
        alert('Contest deleted successfully');
      } else {
        alert('Failed to delete contest');
      }
    } catch (error: any) {
      alert(`Failed to delete contest: ${error.message}`);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('userId');
    router.push('/');
  };

  if (isLoading) {
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
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex gap-4 items-center">
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-800 text-sm sm:text-base touch-manipulation min-h-[44px] px-2"
              >
                Logout
              </button>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 text-sm sm:text-base touch-manipulation min-h-[44px] flex items-center"
              >
                ← Back to Home
              </Link>
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation min-h-[44px] text-sm sm:text-base"
            >
              {showCreateForm ? 'Cancel' : '+ Create New Contest'}
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">Create New Contest</h2>
              <form onSubmit={handleCreateContest}>
                <div className="mb-4">
                  <label className="block text-gray-900 font-semibold mb-2 text-base sm:text-lg">
                    Location (City)
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Paris, France"
                    className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium text-gray-900 bg-white touch-manipulation"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-900 font-semibold mb-2 text-base sm:text-lg">
                    Date (Month/Year)
                  </label>
                  <input
                    type="month"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium text-gray-900 bg-white touch-manipulation"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation min-h-[44px] text-base sm:text-lg font-semibold"
                >
                  Create Contest
                </button>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {contests.map((contest) => (
              <div
                key={contest.id}
                className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border border-gray-200 relative group"
              >
                <Link
                  href={`/admin/contest/${contest.id}`}
                  className="block hover:shadow-xl active:scale-95 transition-all touch-manipulation"
                >
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    {contest.location}
                  </h3>
                  <p className="text-base sm:text-lg text-gray-700 font-medium mb-4">
                    {new Date(contest.date + '-01').toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                  <div className="flex justify-between text-xs sm:text-sm text-gray-500 mb-2">
                    <span>{contest.categories.length} categories</span>
                    <span>{contest.participants.length} participants</span>
                  </div>
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      contest.status === 'draft' ? 'bg-gray-200 text-gray-700' :
                      contest.status === 'active' ? 'bg-green-200 text-green-700' :
                      contest.status === 'voting' ? 'bg-blue-200 text-blue-700' :
                      'bg-purple-200 text-purple-700'
                    }`}>
                      {contest.status}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteContest(contest.id, contest.location);
                  }}
                  className="absolute top-2 right-2 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Delete contest"
                  aria-label="Delete contest"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {contests.length === 0 && !showCreateForm && (
            <div className="text-center py-12 bg-white rounded-lg shadow-lg">
              <p className="text-gray-600 text-lg">No contests yet. Create your first one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

