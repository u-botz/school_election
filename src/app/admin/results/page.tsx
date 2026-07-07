'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, type Candidate, type Session, type Settings } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const [lpCandidates, setLpCandidates] = useState<Candidate[]>([]);
  const [upCandidates, setUpCandidates] = useState<Candidate[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<Session | null>(null);

  const loadData = useCallback(async () => {
    const [lpRes, upRes, settingsRes] = await Promise.all([
      supabase
        .from('candidates')
        .select('*')
        .eq('session', 'lp')
        .order('vote_count', { ascending: false }),
      supabase
        .from('candidates')
        .select('*')
        .eq('session', 'up')
        .order('vote_count', { ascending: false }),
      supabase.from('settings').select('*').single(),
    ]);

    const err = lpRes.error ?? upRes.error ?? settingsRes.error;
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setLpCandidates((lpRes.data ?? []) as Candidate[]);
    setUpCandidates((upRes.data ?? []) as Candidate[]);
    setSettings(settingsRes.data as Settings);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(), 10_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handlePublish = async (sess: Session) => {
    if (!settings) return;
    const candidates = sess === 'lp' ? lpCandidates : upCandidates;
    if (candidates.length === 0) return;

    const winner = candidates[0]; // already sorted desc by vote_count
    setPublishing(sess);

    const update =
      sess === 'lp'
        ? { lp_published: true, lp_winner_id: winner.id }
        : { up_published: true, up_winner_id: winner.id };

    const { error } = await supabase
      .from('settings')
      .update(update)
      .eq('id', settings.id);

    setPublishing(null);
    if (!error) void loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading results…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500 text-sm max-w-sm text-center">{error}</p>
        <p className="text-gray-400 text-xs">
          Ensure a settings row exists in your Supabase table.
        </p>
        <button
          onClick={() => void loadData()}
          className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Live Results</h1>
        <div className="flex items-center gap-2 text-green-700">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-600" />
          </span>
          <span className="text-sm font-medium">Live · updates every 10 s</span>
        </div>
      </div>

      {/* Leaderboards — side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeaderboardSection
          session="lp"
          label="LP"
          fullLabel="Lower Primary"
          candidates={lpCandidates}
          settings={settings}
          publishing={publishing}
          onPublish={(s) => void handlePublish(s)}
        />
        <LeaderboardSection
          session="up"
          label="UP"
          fullLabel="Upper Primary"
          candidates={upCandidates}
          settings={settings}
          publishing={publishing}
          onPublish={(s) => void handlePublish(s)}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Leaderboard Section
// ─────────────────────────────────────────────────────────────────

function LeaderboardSection({
  session,
  label,
  fullLabel,
  candidates,
  settings,
  publishing,
  onPublish,
}: {
  session: Session;
  label: string;
  fullLabel: string;
  candidates: Candidate[];
  settings: Settings | null;
  publishing: Session | null;
  onPublish: (s: Session) => void;
}) {
  const isPublished =
    session === 'lp' ? settings?.lp_published : settings?.up_published;
  const totalVotes = candidates.reduce((sum, c) => sum + c.vote_count, 0);
  const maxVotes = candidates[0]?.vote_count ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Section header */}
      <div className="bg-green-700 text-white px-5 py-4 flex items-center justify-between">
        <h2 className="font-bold text-base">
          {fullLabel}{' '}
          <span className="font-normal text-green-200 text-sm">({label})</span>
        </h2>
        <span className="text-green-200 text-sm">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast
        </span>
      </div>

      {/* Candidate rows */}
      <div className="flex-1 divide-y divide-gray-50">
        {candidates.length === 0 ? (
          <p className="text-center py-10 text-gray-400 text-sm">
            No candidates registered.
          </p>
        ) : (
          candidates.map((c, i) => (
            <LeaderboardRow key={c.id} rank={i + 1} candidate={c} maxVotes={maxVotes} />
          ))
        )}
      </div>

      {/* Publish footer */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-4 flex-wrap">
        {isPublished ? (
          <>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Published ✓
            </span>
            <span className="text-gray-400 text-xs">Winner announced on public screen</span>
          </>
        ) : (
          <>
            <button
              onClick={() => onPublish(session)}
              disabled={!!publishing || candidates.length === 0}
              className="px-5 py-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              {publishing === session ? 'Publishing…' : `Publish ${label} Winner`}
            </button>
            {candidates.length > 0 && (
              <span className="text-xs text-gray-400">
                Leader:{' '}
                <span className="font-medium text-gray-600">{candidates[0].name}</span>{' '}
                ({candidates[0].vote_count} votes)
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Leaderboard Row
// ─────────────────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉'];

function LeaderboardRow({
  rank,
  candidate,
  maxVotes,
}: {
  rank: number;
  candidate: Candidate;
  maxVotes: number;
}) {
  const pct = maxVotes > 0 ? Math.round((candidate.vote_count / maxVotes) * 100) : 0;
  const isLeader = rank === 1;

  return (
    <div className={`px-5 py-3 flex items-center gap-3 ${isLeader ? 'bg-green-50' : ''}`}>
      {/* Rank / medal */}
      <span className="w-6 shrink-0 text-sm font-bold text-center">
        {rank <= 3 ? MEDALS[rank - 1] : <span className="text-gray-300">{rank}</span>}
      </span>

      {/* Photo */}
      <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0">
        {candidate.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.photo_url}
            alt={candidate.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-green-50 text-green-700 font-bold text-xs">
            {candidate.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isLeader ? 'text-green-900' : 'text-gray-900'}`}>
          {candidate.name}
        </p>
        <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-600 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Symbol */}
      <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
        {candidate.symbol_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.symbol_url}
            alt="symbol"
            className="w-full h-full object-contain p-0.5"
          />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
      </div>

      {/* Vote count + pct */}
      <div className="w-14 shrink-0 text-right">
        <span className={`text-sm font-bold ${isLeader ? 'text-green-700' : 'text-gray-700'}`}>
          {candidate.vote_count}
        </span>
        <span className="block text-xs text-gray-400">{pct}%</span>
      </div>
    </div>
  );
}
