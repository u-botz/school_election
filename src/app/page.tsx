import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 relative">
      {/* Branding */}
      <div className="mb-14 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-700 flex items-center justify-center mb-5 shadow-lg">
          <svg
            className="w-9 h-9 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">School Election</h1>
        <p className="mt-3 text-gray-500 text-lg">Cast your vote. Every voice matters.</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-lg">
        <Link
          href="/booth"
          className="flex-1 flex flex-col items-center justify-center gap-2 h-44 rounded-2xl bg-green-700 hover:bg-green-800 active:scale-95 text-white shadow-lg transition-all duration-150"
        >
          <span className="text-4xl select-none">🗳️</span>
          <span className="text-xl font-bold">Voting Booth</span>
          <span className="text-sm text-green-200">Cast your vote here</span>
        </Link>

        <Link
          href="/result"
          className="flex-1 flex flex-col items-center justify-center gap-2 h-44 rounded-2xl bg-white border-2 border-green-700 hover:bg-green-50 active:scale-95 text-green-700 shadow-lg transition-all duration-150"
        >
          <span className="text-4xl select-none">🏆</span>
          <span className="text-xl font-bold">View Results</span>
          <span className="text-sm text-green-600">See who&apos;s winning</span>
        </Link>
      </div>

      {/* Admin link — discreet, fixed bottom-right */}
      <Link
        href="/admin/login"
        className="fixed bottom-6 right-6 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        Admin
      </Link>
    </div>
  );
}
