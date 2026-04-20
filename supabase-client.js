import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

export const supabase = createClient(
  'https://flddtedfeoqqxejaowuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsZGR0ZWRmZW9xcXhlamFvd3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4Mjk1MjgsImV4cCI6MjA5MTQwNTUyOH0.8OtFToBmx7B088BhdoO3Y_BQXRY9KwDXwlFQIAaHJfY'
)
