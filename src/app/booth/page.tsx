'use client';

import { useState, useCallback } from 'react';
import { supabase, type Candidate, type Session } from '@/lib/supabase';
import { playSuccessBeep } from '@/lib/sound';

type Stage = 'session-pick' | 'voting' | 'loading' | 'success' | 'error';

export default function BoothPage() {
  const [stage, setStage] = useState<Stage>('session-pick');
  const [session, setSession] = useState<Session | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pendingCandidate, setPendingCandidate] = useState<Candidate | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteCount, setVoteCount] = useState(0);

  const loadCandidates = useCallback(async (sess: Session) => {
    setLoadingCandidates(true);
    setFetchError(null);
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('session', sess)
      .order('name');
    setLoadingCandidates(false);
    if (error) { setFetchError(error.message); return; }
    setCandidates(data ?? []);
  }, []);

  const selectSession = (sess: Session) => {
    setSession(sess);
    setCandidates([]);
    setFetchError(null);
    setStage('voting');
    void loadCandidates(sess);
  };

  const castVote = useCallback(
    async (candidate: Candidate) => {
      setStage('loading');
      setPendingCandidate(candidate);
      setVoteError(null);
      try {
        const [result] = await Promise.all([
          supabase.rpc('increment_vote', { candidate_id: candidate.id }),
          new Promise<void>((resolve) => setTimeout(resolve, 1000)),
        ]);
        if (result.error) throw new Error(result.error.message);
        playSuccessBeep();
        setVoteCount((n) => n + 1);
        setStage('success');
        setTimeout(async () => {
          await loadCandidates(session!);
          setStage('voting');
        }, 2000);
      } catch (err) {
        setVoteError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setStage('error');
      }
    },
    [session, loadCandidates]
  );

  const castNota = useCallback(() => {
    setStage('loading');
    setTimeout(() => {
      playSuccessBeep();
      setVoteCount((n) => n + 1);
      setStage('success');
      setTimeout(() => setStage('voting'), 2000);
    }, 1500);
  }, []);

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
      voteCount={voteCount}
      onVote={castVote}
      onNota={castNota}
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
// EVM Voting Screen
// ─────────────────────────────────────────────────────────────────

function VotingScreen({
  session,
  candidates,
  loading,
  fetchError,
  voteCount,
  onVote,
  onNota,
  onRetryFetch,
}: {
  session: Session;
  candidates: Candidate[];
  loading: boolean;
  fetchError: string | null;
  voteCount: number;
  onVote: (c: Candidate) => void;
  onNota: () => void;
  onRetryFetch: () => void;
}) {
  const title = session === 'lp' ? 'Lower Primary Election' : 'Upper Primary Election';

  return (
    <div className="min-h-screen bg-gray-300 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Machine outer frame */}
        <div className="bg-[#2a2f3b] rounded-2xl p-1">
          <div className="rounded-xl overflow-hidden border border-[#3a4050]">

            {/* EVM Header */}
            <div className="bg-[#1a3a6b] px-5 py-4 flex items-center gap-4 border-b-2 border-[#0f2a52]">
              <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#1a3a6b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[#e8f0ff] text-sm font-medium tracking-widest uppercase">{title}</p>
                <p className="text-[#7a9fd4] text-xs mt-0.5">School Election · Ballot Unit</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[#7a9fd4] text-xs">EVM</p>
                <p className="text-green-400 text-xs">● READY</p>
              </div>
            </div>

            {/* Instruction strip */}
            <div className="bg-[#e8e2d4] px-5 py-2 text-xs text-[#5a5040] text-center tracking-wide border-b border-[#ccc6b4]">
              Press the blue button next to your candidate to cast your vote
            </div>

            {/* Body */}
            <div className="bg-[#f5f0e8]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Spinner className="w-8 h-8 border-4 border-[#cfc9ba] border-t-[#2a2f3b]" />
                  <p className="text-[#8a7a60] text-sm">Loading candidates…</p>
                </div>
              ) : fetchError ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
                  <p className="text-red-600 font-medium text-sm">Failed to load candidates</p>
                  <p className="text-[#8a7a60] text-xs max-w-xs">{fetchError}</p>
                  <button
                    onClick={onRetryFetch}
                    className="px-4 py-1.5 bg-[#1a4fa8] text-white rounded-lg text-xs hover:bg-[#2060c0] transition-colors cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              ) : candidates.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-[#8a7a60] text-sm">No candidates registered for this session.</p>
                </div>
              ) : (
                <>
                  {/* Column labels */}
                  <div className="flex items-center px-4 py-1.5 gap-3 border-b border-[#cfc9ba] bg-[#ede8da]">
                    <div className="w-6 shrink-0" />
                    <div className="w-14 shrink-0 text-[10px] text-[#8a7a60] text-center">Photo</div>
                    <div className="flex-1 text-[10px] text-[#8a7a60]">Candidate</div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="w-12 text-[10px] text-[#8a7a60] text-center">Symbol</div>
                      <div className="w-2.5" />
                      <div className="w-16" />
                    </div>
                  </div>

                  {/* Candidate rows */}
                  {candidates.map((c, i) => (
                    <EVMRow key={c.id} candidate={c} index={i} onVote={onVote} />
                  ))}

                  {/* NOTA row */}
                  <div className="flex items-center px-4 py-3 gap-3 border-t-2 border-[#b0a890] bg-[#ede8da]">
                    <div className="w-6 h-6 rounded-full bg-[#7f1d1d] text-xs font-medium flex items-center justify-center shrink-0 text-red-200">
                      N
                    </div>
                    <div className="w-14 h-14 rounded-md border border-[#ccc6b4] bg-white flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-[#8a7a60]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    <div className="flex-1 text-sm font-medium text-[#5a5040]">
                      NOTA — None of the above
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="w-12 h-12 shrink-0" />
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-400 border border-gray-500 shrink-0" />
                      <button
                        onClick={onNota}
                        className="w-16 h-8 rounded-full bg-[#1a4fa8] text-white text-xs font-medium tracking-wide hover:bg-[#2060c0] active:bg-[#0f3070] active:translate-y-px transition-all cursor-pointer shrink-0"
                      >
                        VOTE
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-[#2a2f3b] px-5 py-3 flex items-center justify-between">
              <span className="text-[#7a8090] text-xs">Total votes cast</span>
              <span className="text-[#c8d0e0] text-sm font-medium">{voteCount}</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// EVM Row — one candidate
// ─────────────────────────────────────────────────────────────────

function EVMRow({
  candidate,
  index,
  onVote,
}: {
  candidate: Candidate;
  index: number;
  onVote: (c: Candidate) => void;
}) {
  return (
    <div className="flex items-center px-4 py-3 gap-3 border-b border-[#cfc9ba] bg-[#f5f0e8]">
      {/* Serial number */}
      <div className="w-6 h-6 rounded-full bg-[#2a2f3b] text-[#e8f0ff] text-xs font-medium flex items-center justify-center shrink-0">
        {index + 1}
      </div>

      {/* Student photo */}
      <div className="w-14 h-14 rounded-md overflow-hidden border border-[#bbb] shrink-0">
        {candidate.photo_url
          ? <CandidatePhoto src={candidate.photo_url} name={candidate.name} />
          : <AvatarPlaceholder name={candidate.name} />
        }
      </div>

      {/* Name */}
      <div className="flex-1 text-base font-medium text-gray-900 min-w-0 truncate">
        {candidate.name}
      </div>

      {/* Right side: symbol → LED → vote button */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-12 h-12 rounded-md overflow-hidden border border-[#ccc6b4] bg-white flex items-center justify-center shrink-0">
          {candidate.symbol_url
            ? <SymbolImage src={candidate.symbol_url} name={candidate.name} />
            : <SymbolPlaceholder />
          }
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-gray-400 border border-gray-500 shrink-0" />
        <button
          onClick={() => onVote(candidate)}
          className="w-16 h-8 rounded-full bg-[#1a4fa8] text-white text-xs font-medium tracking-wide hover:bg-[#2060c0] active:bg-[#0f3070] active:translate-y-px transition-all cursor-pointer shrink-0"
        >
          VOTE
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Image helpers
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
    <img src={src} alt={`${name} symbol`} className="w-full h-full object-contain p-1" onError={() => setErrored(true)} />
  );
}

function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-full h-full flex items-center justify-center bg-green-700">
      <span className="text-white font-bold text-base">{initials}</span>
    </div>
  );
}

function SymbolPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <h2 className="text-4xl font-extrabold text-white text-center px-6">Thank you for voting!</h2>
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

function Spinner({ className = '' }: { className?: string }) {
  return <div className={`rounded-full animate-spin ${className}`} />;
}
