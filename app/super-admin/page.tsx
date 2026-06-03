'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/PageLoader';
import { LoadingSpinner } from '@/components/LoadingSpinner';

type SuperAdminUser = {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  lastLoginAt: string | null;
  createdContests: {
    id: string;
    location: string;
    date: string;
    stageLabel: string;
  }[];
  joinedContests: {
    id: string;
    location: string;
    date: string;
    stageLabel: string;
    joinedAt: string;
  }[];
};

type SuperAdminContest = {
  id: string;
  location: string;
  date: string;
  stageLabel: string;
  joinCode: string;
  createdAt: string;
  creator: { id: string; name: string; email: string } | null;
  participantCount: number;
  participants: { id: string; name: string; email: string; joinedAt: string }[];
  submittedPhotoCount: number;
  totalPhotoCount: number;
};

function formatDateTime(value: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMonthYear(date: string): string {
  return new Date(date + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function ContestList({ items }: { items: { id: string; location: string; date: string; stageLabel: string }[] }) {
  if (items.length === 0) {
    return <span className="text-gray-500">None</span>;
  }

  return (
    <ul className="space-y-1">
      {items.map((contest) => (
        <li key={contest.id} className="text-sm text-gray-800">
          {contest.location} ({formatMonthYear(contest.date)}) · {contest.stageLabel}
        </li>
      ))}
    </ul>
  );
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'contests'>('users');
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [contests, setContests] = useState<SuperAdminContest[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const response = await fetch('/api/super-admin/auth/session');
      const data = await response.json();
      if (!data.authenticated) {
        router.replace('/super-admin/login');
        return;
      }
      setIsCheckingSession(false);
    };

    void checkSession();
  }, [router]);

  useEffect(() => {
    if (isCheckingSession) return;

    const loadData = async () => {
      setIsLoadingData(true);
      setError('');
      try {
        const [usersResponse, contestsResponse] = await Promise.all([
          fetch('/api/super-admin/users'),
          fetch('/api/super-admin/contests'),
        ]);

        if (usersResponse.status === 401 || contestsResponse.status === 401) {
          router.replace('/super-admin/login');
          return;
        }

        if (!usersResponse.ok || !contestsResponse.ok) {
          throw new Error('Failed to load site data');
        }

        setUsers(await usersResponse.json());
        setContests(await contestsResponse.json());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load site data');
      } finally {
        setIsLoadingData(false);
      }
    };

    void loadData();
  }, [isCheckingSession, router]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [users, search]);

  const filteredContests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contests;
    return contests.filter(
      (contest) =>
        contest.location.toLowerCase().includes(query) ||
        contest.creator?.name.toLowerCase().includes(query) ||
        contest.creator?.email.toLowerCase().includes(query) ||
        contest.joinCode.toLowerCase().includes(query)
    );
  }, [contests, search]);

  const handleLogout = async () => {
    await fetch('/api/super-admin/auth/logout', { method: 'POST' });
    router.replace('/super-admin/login');
  };

  if (isCheckingSession) {
    return <PageLoader message="Checking access..." />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="container mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Photo Hunt</p>
            <h1 className="text-xl sm:text-2xl font-bold">Site owner console</h1>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="self-start sm:self-auto rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 min-h-[44px]"
          >
            Log out
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-lg bg-white p-1 shadow-sm border border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-md text-sm font-medium min-h-[44px] ${
                  activeTab === 'users' ? 'bg-slate-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Users ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contests')}
                className={`px-4 py-2 rounded-md text-sm font-medium min-h-[44px] ${
                  activeTab === 'contests' ? 'bg-slate-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Contests ({contests.length})
              </button>
            </div>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'users' ? 'Search users...' : 'Search contests...'}
              className="w-full sm:w-72 px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 min-h-[44px]"
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoadingData ? (
            <div className="flex items-center justify-center py-16 text-gray-600 gap-3">
              <LoadingSpinner />
              Loading site data...
            </div>
          ) : activeTab === 'users' ? (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Registered: {formatDateTime(user.registeredAt)}</div>
                      <div>Last login: {formatDateTime(user.lastLoginAt)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Organizer of</h3>
                      <ContestList items={user.createdContests} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Participant in</h3>
                      <ContestList items={user.joinedContests} />
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-gray-500 py-10">No users match your search.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContests.map((contest) => (
                <div key={contest.id} className="rounded-xl bg-white border border-gray-200 shadow-sm p-5 sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {contest.location} · {formatMonthYear(contest.date)}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {contest.stageLabel} · Join code {contest.joinCode}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>
                        Creator:{' '}
                        {contest.creator
                          ? `${contest.creator.name} (${contest.creator.email})`
                          : 'Unknown'}
                      </div>
                      <div>Created: {formatDateTime(contest.createdAt)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Participants</p>
                      <p className="text-2xl font-bold text-slate-900">{contest.participantCount}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Submitted photos</p>
                      <p className="text-2xl font-bold text-slate-900">{contest.submittedPhotoCount}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Total uploads</p>
                      <p className="text-2xl font-bold text-slate-900">{contest.totalPhotoCount}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Participants</h3>
                    {contest.participants.length === 0 ? (
                      <p className="text-sm text-gray-500">No participants yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {contest.participants.map((participant) => (
                          <li key={participant.id} className="text-sm text-gray-800">
                            {participant.name} ({participant.email}) · joined {formatDateTime(participant.joinedAt)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
              {filteredContests.length === 0 && (
                <p className="text-center text-gray-500 py-10">No contests match your search.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
