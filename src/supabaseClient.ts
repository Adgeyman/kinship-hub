import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jzojtkrkzkzukbstbjoq.supabase.co';
const supabaseAnonKey = 'sb_publishable_QCh9WNXOP_kCkJ6yu5XwYg_S9I5XhwD';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);