import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authenticated = cookieStore.get('admin_session')?.value === 'authenticated';

  // Login page renders without the nav bar
  if (!authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-green-700 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <a href="/" className="font-bold text-lg whitespace-nowrap hover:text-green-200 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          School Election Admin
        </a>

        <div className="flex items-center gap-6">
          <Link
            href="/admin/candidates"
            className="text-sm hover:text-green-200 transition-colors"
          >
            Candidates
          </Link>
          <Link
            href="/admin/results"
            className="text-sm hover:text-green-200 transition-colors"
          >
            Results
          </Link>
        </div>

        <a
          href="/api/admin/logout"
          className="text-sm border border-white/50 rounded-lg px-3 py-1.5 hover:bg-white/10 transition-colors whitespace-nowrap"
        >
          Logout
        </a>
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}
