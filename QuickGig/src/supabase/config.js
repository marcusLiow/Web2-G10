import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tlgvoqyldznsvrwugedl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZ3ZvcXlsZHpuc3Zyd3VnZWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNTczODIsImV4cCI6MjA3NTgzMzM4Mn0.hQ5uuw38DgIpNSqXO86TEBprBx9wdQnWUCBp71bTgqI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)