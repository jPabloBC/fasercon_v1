import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabaseInstance;
export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
})();

// Para el servidor (con service role key si la tienes)
let supabaseAdminInstance;
export const supabaseAdmin = (() => {
  if (!supabaseAdminInstance) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey && process.env.NODE_ENV === 'production') {
      console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY not set in production. Using anon key - some data may not be visible due to RLS policies.');
    }
    supabaseAdminInstance = createClient(
      supabaseUrl,
      serviceKey || supabaseAnonKey
    );
  }
  return supabaseAdminInstance;
})();