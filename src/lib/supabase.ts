import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lxizfvswoxwpazwylvpk.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_PffriF5Q8th9yj1quQWm4A_E9KxZnkf'

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase')
)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
