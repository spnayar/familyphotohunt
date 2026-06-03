'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingOverlay } from '@/components/LoadingOverlay';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/super-admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.replace('/super-admin');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <LoadingOverlay show={loading} message="Signing in..." />
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">Photo Hunt</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Site owner login</h1>
        <p className="text-sm text-gray-600 mb-6">
          This console is separate from participant and contest organizer accounts.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="super-admin-username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="super-admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900"
              required
            />
          </div>
          <div>
            <label htmlFor="super-admin-password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="super-admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50 min-h-[44px]"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
