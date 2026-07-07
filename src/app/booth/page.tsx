'use client';

import { useState, useCallback } from 'react';
import { supabase, type Candidate, type Session } from '@/lib/supabase';
import { playSuccessBeep } from '@/lib/sound';

type Stage = 'session-pick' | 'voting' | 'loading' | 'success' | 'error';

// ─────────────────────────────────────────────────────────────────
// Page — state machine
// ─────────────────────────────────────────────────────────────────

export default function BoothPage() {
  const [stage, setStage] = useState<Stage>('session-pick');
  const [session, setSession] = useState<Session | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pendingCandidate, setPendingCandidate] = useState<Candidate | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const loadCandidates = useCallback(async (sess: Session) => {
    setLoadingCandidates(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('session', sess)
      .order('name');
    setLoadingCandidates(false);
    if (error) {
      setFetchError(error.message);
      return;
    }
    setCandidates(data ?? []);
  }, []);

  const selectSession = (sess: Session) => {
    setSession(sess);
    setCandidates([]);
    setFetchError(null);
    setStage('voting');
    void loadCandidates(sess);
  };

  const changeSession = () => {
    setSession(null);
    setCandidates([]);
    setFetchError(null);
    setVoteError(null);
    setPendingCandidate(null);
    setStage('session-pick');
  };

  const castVote = useCallback(
    async (candidate: Candidate) => {
      setStage('loading');
      setPendingCandidate(candidate);
      setVoteError(null);

      try {
        const [result] = await Promise.all([
          supabase.rpc('increment_vote', { candidate_id: candidate.id }),
          new Promise<void>((resolve) => setTimeout(resolve, 3000)),
        ]);

        if (result.error) throw new Error(result.error.message);

        playSuccessBeep();
        setStage('success');

        setTimeout(async () => {
          await loadCandidates(session!);
          setStage('voting');
        }, 2000);
      } catch (err) {
        setVoteError(
          err instanceof Error ? err.message : 'An unknown error occurred.'
        );
        setStage('error');
      }
    },
    [session, loadCandidates]
  );

  if (stage === 'session-pick') return <SessionPicker onSelect={selectSession} />;
  if (stage === 'loading') return <LoadingOverlay />;
  if (stage === 'success') return <SuccessScreen />;
  if (stage === 'error') {
    return (
      <ErrorScreen
        message={voteError ?? 'Something went wrong. Please try again.'}
        onRetry={() => pendingCandidate && void castVote(pendingCandidate)}
        onBack={() => setStage('voting')}
      />
    );
  }

  return (
    <VotingScreen
      session={session!}
      candidates={candidates}
      loading={loadingCandidates}
      fetchError={fetchError}
      onVote={castVote}
      onChangeSession={changeSession}
      onRetryFetch={() => void loadCandidates(session!)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// Session Picker
// ─────────────────────────────────────────────────────────────────

function SessionPicker({ onSelect }: { onSelect: (s: Session) => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 gap-10">
      <div className="text-center">
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-green-700 flex items-center justify-center shadow-lg">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">School Election</h1>
        <p className="mt-2 text-gray-500 text-lg">Select your class section to begin</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
        {([['lp', 'Lower Primary'], ['up', 'Upper Primary']] as [Session, string][]).map(
          ([sess, label]) => (
            <button
              key={sess}
              onClick={() => onSelect(sess)}
              className="flex-1 flex flex-col items-center justify-center h-44 rounded-2xl bg-green-700 hover:bg-green-800 active:bg-green-900 active:scale-95 text-white shadow-lg transition-all duration-150 cursor-pointer"
            >
              <span className="text-5xl font-black tracking-widest">{sess.toUpperCase()}</span>
              <span className="mt-1 text-sm font-medium text-green-200">{label}</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Voting Screen
// ─────────────────────────────────────────────────────────────────

function VotingScreen({
  session,
  candidates,
  loading,
  fetchError,
  onVote,
  onChangeSession,
  onRetryFetch,
}: {
  session: Session;
  candidates: Candidate[];
  loading: boolean;
  fetchError: string | null;
  onVote: (c: Candidate) => void;
  onChangeSession: () => void;
  onRetryFetch: () => void;
}) {
  const title = session === 'lp' ? 'Lower Primary Election' : 'Upper Primary Election';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-green-700 text-white px-5 py-4 flex items-center justify-between shadow-md sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <p className="text-green-200 text-xs">Tap a candidate card to cast your vote</p>
        </div>
        <button
          onClick={onChangeSession}
          className="shrink-0 ml-4 text-sm border border-white/50 rounded-lg px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          Change Session
        </button>
      </header>

      <main className="flex-1 p-4 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Spinner className="w-10 h-10 border-4 border-green-700/20 border-t-green-700" />
            <p className="text-gray-400 text-sm">Loading candidates…</p>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <p className="text-red-500 font-medium">Failed to load candidates</p>
            <p className="text-gray-400 text-sm max-w-xs">{fetchError}</p>
            <button
              onClick={onRetryFetch}
              className="px-5 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors text-sm cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400">No candidates registered for this session.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {candidates.map((c) => (
              <CandidateCard key={c.id} candidate={c} onVote={onVote} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Candidate Card
// ─────────────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  onVote,
}: {
  candidate: Candidate;
  onVote: (c: Candidate) => void;
}) {
  return (
    <button
      onClick={() => onVote(candidate)}
      className="w-full flex flex-col items-center gap-3 bg-white rounded-2xl shadow hover:shadow-xl active:scale-95 transition-all duration-150 cursor-pointer border-2 border-transparent hover:border-green-700 p-4"
    >
      <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100">
        {candidate.photo_url ? (
          <CandidatePhoto src={candidate.photo_url} name={candidate.name} />
        ) : (
          <AvatarPlaceholder name={candidate.name} />
        )}
      </div>

      <p className="font-bold text-gray-900 text-center text-sm leading-snug w-full line-clamp-2">
        {candidate.name}
      </p>

      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0">
        {candidate.symbol_url ? (
          <SymbolImage src={candidate.symbol_url} name={candidate.name} />
        ) : (
          <SymbolPlaceholder />
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// Image helpers with error fallback
// ─────────────────────────────────────────────────────────────────

function CandidatePhoto({ src, name }: { src: string; name: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) return <AvatarPlaceholder name={name} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setErrored(true)} />
  );
}

function SymbolImage({ src, name }: { src: string; name: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) return <SymbolPlaceholder />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} symbol`}
      className="w-full h-full object-contain p-1"
      onError={() => setErrored(true)}
    />
  );
}

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-full h-full flex items-center justify-center bg-green-50">
      <span className="w-14 h-14 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-xl">
        {initials}
      </span>
    </div>
  );
}

function SymbolPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Full-screen overlays
// ─────────────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-gray-900/85 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
      <Spinner className="w-16 h-16 border-4 border-white/20 border-t-white" />
      <p className="text-white text-2xl font-semibold">Recording vote…</p>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div className="fixed inset-0 bg-green-700 flex flex-col items-center justify-center gap-5">
      <span className="text-8xl select-none">🎉</span>
      <h2 className="text-4xl font-extrabold text-white text-center px-6">
        Thank you for voting!
      </h2>
      <p className="text-green-200 text-lg">Your vote has been recorded.</p>
    </div>
  );
}

function ErrorScreen({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center gap-6 p-8">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Vote Failed</h2>
        <p className="text-gray-500 mt-2 max-w-sm text-sm">{message}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={onRetry}
          className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold text-sm transition-colors cursor-pointer"
        >
          Try Again
        </button>
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold text-sm transition-colors cursor-pointer"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Spinner
// ─────────────────────────────────────────────────────────────────

function Spinner({ className = '' }: { className?: string }) {
  return <div className={`rounded-full animate-spin ${className}`} />;
}
