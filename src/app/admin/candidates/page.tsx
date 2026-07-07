'use client';

// NOTE: Before using candidate uploads, create a PUBLIC storage bucket named
// "election-assets" in your Supabase dashboard under Storage → New Bucket.
// Set the bucket to public so photo and symbol URLs are accessible in the booth.

import { useState, useEffect, useCallback } from 'react';
import { supabase, type Candidate, type Session } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default function CandidatesPage() {
  const [lpCandidates, setLpCandidates] = useState<Candidate[]>([]);
  const [upCandidates, setUpCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    const [lpRes, upRes] = await Promise.all([
      supabase.from('candidates').select('*').eq('session', 'lp').order('name'),
      supabase.from('candidates').select('*').eq('session', 'up').order('name'),
    ]);
    setLoading(false);
    const err = lpRes.error ?? upRes.error;
    if (err) {
      setPageError(err.message);
      return;
    }
    setLpCandidates((lpRes.data ?? []) as Candidate[]);
    setUpCandidates((upRes.data ?? []) as Candidate[]);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading candidates…
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{pageError}</p>
        <button
          onClick={() => void loadAll()}
          className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
      <CandidateSection
        session="lp"
        label="LP"
        fullLabel="Lower Primary"
        candidates={lpCandidates}
        onRefresh={loadAll}
      />
      <CandidateSection
        session="up"
        label="UP"
        fullLabel="Upper Primary"
        candidates={upCandidates}
        onRefresh={loadAll}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Candidate Section
// ─────────────────────────────────────────────────────────────────

function CandidateSection({
  session,
  label,
  fullLabel,
  candidates,
  onRefresh,
}: {
  session: Session;
  label: string;
  fullLabel: string;
  candidates: Candidate[];
  onRefresh: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [symbolFile, setSymbolFile] = useState<File | null>(null);

  function resetForm() {
    setName('');
    setPhotoFile(null);
    setSymbolFile(null);
    setFormError(null);
    setAdding(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setFormError('Name is required.'); return; }

    setSaving(true);
    setFormError(null);

    try {
      const [photoUrl, symbolUrl] = await Promise.all([
        photoFile ? uploadFile(photoFile, 'photos') : Promise.resolve(null),
        symbolFile ? uploadFile(symbolFile, 'symbols') : Promise.resolve(null),
      ]);

      const { error } = await supabase.from('candidates').insert({
        name: name.trim(),
        session,
        photo_url: photoUrl,
        symbol_url: symbolUrl,
        vote_count: 0,
      });

      if (error) throw new Error(error.message);

      resetForm();
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save candidate.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(candidate: Candidate) {
    if (!window.confirm(`Delete "${candidate.name}"? This cannot be undone.`)) return;
    setDeleting(candidate.id);
    setDeleteError(null);
    const { error } = await supabase.from('candidates').delete().eq('id', candidate.id);
    setDeleting(null);
    if (error) { setDeleteError(error.message); return; }
    await onRefresh();
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900">
          {fullLabel}{' '}
          <span className="text-gray-400 font-normal text-base">
            — {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
          </span>
        </h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors cursor-pointer font-medium"
          >
            + Add Candidate
          </button>
        )}
      </div>

      {deleteError && (
        <p className="text-red-500 text-sm mb-2">Delete failed: {deleteError}</p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {candidates.length === 0 && !adding ? (
          <p className="text-center py-10 text-gray-400 text-sm">
            No {label} candidates yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {candidates.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3">
                {/* Photo */}
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 shrink-0">
                  {c.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.photo_url}
                      alt={c.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-green-50 text-green-700 font-bold text-xs">
                      {c.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name */}
                <span className="flex-1 font-medium text-gray-900 text-sm">{c.name}</span>

                {/* Symbol */}
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                  {c.symbol_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.symbol_url}
                      alt={`${c.name} symbol`}
                      className="w-full h-full object-contain p-0.5"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => void handleDelete(c)}
                  disabled={deleting === c.id}
                  className="text-sm px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {deleting === c.id ? 'Deleting…' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Inline add form */}
        {adding && (
          <form
            onSubmit={(e) => void handleSave(e)}
            className="p-5 border-t border-gray-100 bg-gray-50"
          >
            <h3 className="font-semibold text-gray-800 mb-4">New {fullLabel} Candidate</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Session</label>
                <input
                  type="text"
                  value={`${label} — ${fullLabel}`}
                  disabled
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-xs file:font-medium hover:file:bg-green-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Election Symbol</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSymbolFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-xs file:font-medium hover:file:bg-green-100 cursor-pointer"
                />
              </div>
            </div>

            {formError && (
              <p className="text-red-500 text-sm mb-4">{formError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                {saving ? 'Saving…' : 'Save Candidate'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="px-5 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// Storage upload helper
// ─────────────────────────────────────────────────────────────────

async function uploadFile(file: File, folder: 'photos' | 'symbols'): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('election-assets')
    .upload(path, file, { cacheControl: '3600' });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from('election-assets').getPublicUrl(path);
  return data.publicUrl;
}
