import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser usage (limited permissions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client with service role (full permissions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const AUDIO_BUCKET = "audio";
export const IMAGES_BUCKET = "images";
