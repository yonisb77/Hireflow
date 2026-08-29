import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY saknas. Kopiera .env.example till .env och fyll i dina Supabase-projektvärden.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
