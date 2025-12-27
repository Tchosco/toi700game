import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL;

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Aviso no console para facilitar o diagnóstico de ambiente
  console.warn(
    '[supabase] Variáveis de ambiente não definidas: SUPABASE_URL/SUPABASE_ANON_KEY (ou VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY)'
  );
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});