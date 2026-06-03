import Link from 'next/link';

export default function HelpHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 sm:py-16">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm sm:text-base touch-manipulation min-h-[44px] inline-flex items-center mb-6"
          >
            ← Back to Photo Hunt
          </Link>

          <header className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">Help</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">How Photo Hunt works</h1>
            <p className="text-base sm:text-lg text-gray-600">
              Choose the guide that matches your role. You can read these anytime — nothing here changes your contest.
            </p>
          </header>

          <div className="space-y-4">
            <Link
              href="/help/admin"
              className="block rounded-xl bg-white shadow-lg border-2 border-transparent hover:border-blue-400 p-6 sm:p-8 transition-all touch-manipulation"
            >
              <div className="text-3xl mb-3" aria-hidden="true">
                🎯
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Organizer guide</h2>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Create a contest, add categories, invite participants, run voting, and share results.
              </p>
              <p className="mt-4 text-blue-600 font-medium text-sm sm:text-base">Read organizer guide →</p>
            </Link>

            <Link
              href="/help/participants"
              className="block rounded-xl bg-white shadow-lg border-2 border-transparent hover:border-purple-400 p-6 sm:p-8 transition-all touch-manipulation"
            >
              <div className="text-3xl mb-3" aria-hidden="true">
                📷
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Participant guide</h2>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Join with a code, upload photos, vote for favorites, and view the winners.
              </p>
              <p className="mt-4 text-purple-600 font-medium text-sm sm:text-base">Read participant guide →</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
