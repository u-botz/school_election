'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, type Candidate, type Settings } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────
// Confetti config — deterministic values, no Math.random()
// ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
  '#15803d', '#22c55e', '#f59e0b', '#fbbf24',
  '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899',
];
const CONFETTI_COUNT = 52;

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [lpWinner, setLpWinner] = useState<Candidate | null>(null);
  const [upWinner, setUpWinner] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWinner = useCallback(async (id: string): Promise<Candidate | null> => {
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();
    return data ? (data as Candidate) : null;
  }, []);

  const loadData = useCallback(async () => {
    const { data: sData } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (!sData) {
      setLoading(false);
      return;
    }

    const s = sData as Settings;
    setSettings(s);

    const [lp, up] = await Promise.all([
      s.lp_published && s.lp_winner_id ? fetchWinner(s.lp_winner_id) : Promise.resolve(null),
      s.up_published && s.up_winner_id ? fetchWinner(s.up_winner_id) : Promise.resolve(null),
    ]);

    setLpWinner(lp);
    setUpWinner(up);
    setLoading(false);
  }, [fetchWinner]);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(), 15_000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-700/20 border-t-green-700 rounded-full animate-spin" />
      </div>
    );
  }

  const showLp = settings?.lp_published && lpWinner;
  const showUp = settings?.up_published && upWinner;
  const anyToShow = showLp || showUp;

  if (!anyToShow) {
    return <WaitingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex flex-col items-center justify-center py-14 px-6 relative overflow-hidden">
      <Confetti />

      {/* Back to home */}
      <a
        href="/"
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg border border-white/20 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Home
      </a>

      {/* Heading */}
      <div className="relative z-10 text-center mb-12">
        <p className="text-green-300 text-xs font-semibold uppercase tracking-widest mb-3">
          Official Announcement
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-lg">
          🎉 Election Results
        </h1>
      </div>

      {/* Winner cards */}
      <div
        className={`relative z-10 flex flex-col items-center gap-8 ${
          showLp && showUp ? 'sm:flex-row sm:items-start sm:justify-center sm:gap-12' : ''
        }`}
      >
        {showLp && lpWinner && <WinnerCard candidate={lpWinner} session="lp" />}
        {showUp && upWinner && <WinnerCard candidate={upWinner} session="up" />}
      </div>

      {/* Auto-refresh note */}
      <p className="relative z-10 mt-12 text-green-500 text-xs">
        This page updates automatically every 15 seconds
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Waiting screen
// ─────────────────────────────────────────────────────────────────

function WaitingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-8 p-8">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
        <svg
          className="w-12 h-12 text-green-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Results Not Announced Yet</h1>
        <p className="text-gray-500 mt-3 text-lg">The election is still in progress.</p>
        <p className="text-gray-400 text-sm mt-2">This page refreshes automatically every 15 seconds.</p>
      </div>

      {/* Bouncing dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-green-700 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Winner card
// ─────────────────────────────────────────────────────────────────

function WinnerCard({
  candidate,
  session,
}: {
  candidate: Candidate;
  session: 'lp' | 'up';
}) {
  const label = session === 'lp' ? 'LP School Leader' : 'UP School Leader';
  const initials = candidate.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-5 text-center w-72 sm:w-80">
      {/* Crown */}
      <span className="text-5xl leading-none select-none">👑</span>

      {/* Photo */}
      <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-yellow-400 shadow-xl shrink-0">
        {candidate.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.photo_url}
            alt={candidate.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-green-700 text-white font-extrabold text-4xl">
            {initials}
          </div>
        )}
      </div>

      {/* Name */}
      <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
        {candidate.name}
      </h2>

      {/* Symbol */}
      {candidate.symbol_url && (
        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={candidate.symbol_url}
            alt="election symbol"
            className="w-full h-full object-contain p-1"
          />
        </div>
      )}

      {/* Session badge */}
      <span className="px-5 py-2 bg-green-700 text-white rounded-full text-sm font-bold tracking-wide">
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Confetti — deterministic so no hydration mismatch
// ─────────────────────────────────────────────────────────────────

function Confetti() {
  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-12px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(105vh)  rotate(720deg); opacity: 0.1; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: CONFETTI_COUNT }, (_, i) => {
          const left = `${(i * 1.97) % 100}%`;
          const delay = `${(i * 0.19) % 5}s`;
          const duration = `${3 + (i * 0.11) % 3}s`;
          const size = 7 + (i % 8);
          const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
          const isCircle = i % 3 === 0;

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left,
                top: -size,
                width: size,
                height: size,
                backgroundColor: color,
                borderRadius: isCircle ? '50%' : '2px',
                animation: `confettiFall ${duration} linear ${delay} infinite`,
              }}
            />
          );
        })}
      </div>
    </>
  );
}
