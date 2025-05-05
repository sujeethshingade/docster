import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, 
    autoRefreshToken: true, 
    detectSessionInUrl: false, 
  },
  global: {
    headers: {
      'X-Client-Info': 'docster-client'
    }
  }
});

// Initialize client-side user ID for consistency
if (typeof window !== 'undefined') {
  // Function to generate a stable client ID
  const getClientId = () => {
    let clientId = localStorage.getItem('docster_client_id');
    
    if (!clientId) {
      clientId = 'client-' + Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
      localStorage.setItem('docster_client_id', clientId);
    }
    
    // Also store it in current_user_id for the API to use
    localStorage.setItem('current_user_id', clientId);
    
    return clientId;
  };
  
  getClientId();
} 