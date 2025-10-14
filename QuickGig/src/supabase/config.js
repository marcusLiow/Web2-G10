import { createClient } from '@supabase/supabase-js'

<<<<<<< HEAD
const supabaseUrl = 'https://tlgvoqyldznsvrwugedl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZ3ZvcXlsZHpuc3Zyd3VnZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNTczODIsImV4cCI6MjA3NTgzMzM4Mn0.hQ5uuw38DgIpNSqXO86TEBprBx9wdQnWUCBp71bTgqI'
=======
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
>>>>>>> c8d3327598a5f29bf143b13dbe22fb35d1fbc1e9

export const supabase = createClient(supabaseUrl, supabaseAnonKey)