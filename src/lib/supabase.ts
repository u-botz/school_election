import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
