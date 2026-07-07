import { createClient } from "@supabase/supabase-js";

// Fallbacks prevent createClient from throwing during static prerendering
// when env vars haven't been filled in yet.
// || (not ??) so empty-string env vars also fall back to the placeholder,
// preventing createClient from throwing during static prerendering.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Session = "lp" | "up";

export interface Candidate {
  id: string;
  name: string;
  session: Session;
  photo_url: string | null;
  symbol_url: string | null;
  vote_count: number;
  created_at: string;
}

export interface Settings {
  id: number;
  lp_published: boolean;
  up_published: boolean;
  lp_winner_id: string | null;
  up_winner_id: string | null;
}
