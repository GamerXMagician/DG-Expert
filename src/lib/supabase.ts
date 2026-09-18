import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

// The app must never crash on a blank screen if env is missing — surface a clear
// console warning and let isSupabaseConfigured() drive a friendly banner instead.
export const isSupabaseConfigured = Boolean(
  url && key && url !== 'YOUR_SUPABASE_URL' && key !== 'YOUR_PUBLISHABLE_KEY',
)

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[DG Expert] Supabase is not fully configured. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY in your .env — see .env.example.',
  )
}

// Fall back to harmless placeholders so createClient does not throw during dev
// before configuration is complete.
export const supabase = createClient(
  url && url !== 'YOUR_SUPABASE_URL' ? url : 'https://placeholder.supabase.co',
  key && key !== 'YOUR_PUBLISHABLE_KEY' ? key : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
