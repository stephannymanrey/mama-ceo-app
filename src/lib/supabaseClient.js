import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ subscription: { unsubscribe: () => {} } }),
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase no configurado') }),
        signUp: async () => ({ data: null, error: new Error('Supabase no configurado') }),
        signOut: async () => ({ error: null })
      }
    };

if (!isSupabaseConfigured) {
  console.warn('Supabase no está configurado. La aplicación usará localStorage hasta que agregues las variables de entorno.');
}
