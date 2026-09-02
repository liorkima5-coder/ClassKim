import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('חסרים משתני סביבה של Supabase בקובץ .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)