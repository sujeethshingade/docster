import { API_URL } from './config';
import { supabase } from './supabase';

// Create a consistent auth check function
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    // Try to ensure Supabase auth first
    const supabaseAuthed = await ensureSupabaseAuth();
    
    // Even if Supabase auth fails, check GitHub token
    const hasGithubToken = localStorage.getItem('github_token') !== null;
    
    if (supabaseAuthed || hasGithubToken) {
      updateAuthState(true);
      return true;
    }
    
    updateAuthState(false);
    return false;
  } catch (err) {
    console.error('Auth check error:', err);
    
    // If GitHub token exists, consider authenticated regardless of errors
    const hasGithubToken = localStorage.getItem('github_token') !== null;
    if (hasGithubToken) {
      updateAuthState(true);
      return true;
    }
    
    updateAuthState(false);
    return false;
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('github_token');
  }
  return null;
};

// Add this function to notify other components about auth changes
export const notifyAuthChange = () => {
  if (typeof window !== 'undefined') {
    // Dispatch a storage event that will be caught by other components
    window.dispatchEvent(new Event('auth-change'));
    
    // Also dispatch a storage event for backward compatibility
    window.dispatchEvent(new Event('storage'));
  }
};

export const updateAuthState = (isAuthenticated: boolean) => {
  if (typeof window !== 'undefined') {
    try {
      if (isAuthenticated) {
        localStorage.setItem('user_authenticated', 'true');
      } else {
        localStorage.removeItem('user_authenticated');
      }
      
      notifyAuthChange();
    } catch (error) {
      console.error('Error updating auth state:', error);
    }
  }
};

export const getCurrentUser = async () => {
  try {
    // Try to get user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // If we have a valid Supabase user, return it
      return user;
    }
    
    // If no Supabase user but we have GitHub token, try to authenticate with GitHub
    const githubToken = localStorage.getItem('github_token');
    if (githubToken) {
      try {
        // Get GitHub user info to find email
        const githubUserResponse = await authenticatedFetch(`${API_URL}/github/user`);
        const githubUserData = await githubUserResponse.json();
        
        if (githubUserData.status === 'success' && githubUserData.user && githubUserData.user.email) {
          const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
            email: githubUserData.user.email,
            password: githubToken
          });
          
          if (signInError && !signInError.message.includes('User already registered')) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: githubUserData.user.email,
              password: githubToken,
              options: {
                data: {
                  github_username: githubUserData.user.login,
                  github_id: githubUserData.user.id,
                  avatar_url: githubUserData.user.avatar_url || ''
                }
              }
            });
            
            if (!signUpError && signUpData.user) {
              return signUpData.user;
            }
          } else if (!signInError && authData.user) {
            return authData.user;
          }
        }
      } catch (err) {
        console.error('Error authenticating with GitHub user info:', err);
      }
    }
    
    return null;
  } catch (err) {
    console.error('Error getting current user:', err);
    return null;
  }
};

// Create an authenticated fetch wrapper with improved error handling
const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Always get a fresh token for each request
  const token = typeof window !== 'undefined' ? localStorage.getItem('github_token') : null;
  
  // Debug URL we're calling
  console.log('API request to:', url);
  
  // Prepare headers with token
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  
  // Make the request with token included
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText} for ${url}`);
    }
    
    return response;
  } catch (err) {
    console.error(`Network error when calling ${url}:`, err);
    throw err;
  }
};

// Replace getHeaders with our new approach
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Get token directly from localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('github_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// Wrap the API method that fetches repositories to never clear auth state
export const getRepositoriesSafe = async () => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('github_token') : null;
    if (!token) {
      return { 
        status: 'error', 
        message: 'Authentication required. Please connect your GitHub account.'
      };
    }

    const response = await authenticatedFetch(`${API_URL}/github/repositories`);
    
    if (!response.ok) {
      console.error(`Error fetching repositories: ${response.status}`);
      return { 
        status: 'error',
        message: 'Failed to fetch repositories. Please try again.'
      };
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return { 
      status: 'error', 
      message: 'Failed to fetch repositories. Please try again.'
    };
  }
};

export const api = {
  API_URL,
  
  connectGitHub: async () => {
    try {
      const response = await fetch(`${API_URL}/github/connect`, {
        method: 'POST',
        headers: getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect to GitHub');
      }
      
      const data = await response.json();
      
      if (data.status === 'redirect') {
        return data;
      }
      
      if (data.status === 'success' && data.token) {
        localStorage.setItem('github_token', data.token);
        localStorage.setItem('user_authenticated', 'true');
        
        updateAuthState(true);
        
        // Create or update user in Supabase
        if (data.email && data.username && data.id) {
          try {
            const { data: user, error } = await supabase.auth.signUp({
              email: data.email,
              password: crypto.randomUUID(),
              options: {
                data: {
                  github_username: data.username,
                  github_id: data.id,
                  avatar_url: data.avatar_url || ''
                }
              }
            });
            
            if (error) {
              // If user exists, sign them in
              if (error.message.includes('User already registered')) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                  email: data.email,
                  password: crypto.randomUUID()
                });
                
                if (signInError) {
                  console.error('Error signing in:', signInError);
                }
              } else {
                console.error('Error creating user:', error);
              }
            }
          } catch (err) {
            console.error('Error in user creation:', err);
          }
        }
        
        notifyAuthChange();
      }
      
      return data;
    } catch (error) {
      console.error('GitHub connection error:', error);
      updateAuthState(false);
      throw error;
    }
  },
  
  // Get GitHub user info
  getGitHubUser: async () => {
    try {
      const response = await fetch(`${API_URL}/github/user`, {
        headers: getHeaders(),
      });
      return response.json();
    } catch (err) {
      console.error('Error fetching GitHub user:', err);
      return { status: 'error', message: 'Failed to fetch GitHub user' };
    }
  },

  // Logout from GitHub
  logoutGitHub: async () => {
    try {
      const response = await fetch(`${API_URL}/github/logout`, {
        method: 'POST',
        headers: getHeaders(),
      });
      
      updateAuthState(false);
      await supabase.auth.signOut();
      
      return response.json();
    } catch (err) {
      console.error('Error logging out from GitHub:', err);
      updateAuthState(false);
      return { status: 'error', message: 'Failed to logout' };
    }
  },

  getRepositories: async () => {
    return getRepositoriesSafe();
  },

  getRepository: async (repoName: string) => {
    const response = await fetch(`${API_URL}/github/repository/${repoName}`, {
      headers: getHeaders(),
    });
    return response.json();
  },

  generateDocumentation: async (repoName: string) => {
    try {
      // Make a direct fetch with detailed error logging
      const token = localStorage.getItem('github_token');
      if (!token) {
        return { status: 'error', message: 'Authentication required' };
      }
      
      // Log the API URL we're about to call
      const apiUrl = `${API_URL}/documentation/generate`;
      console.log('Calling documentation generation API:', apiUrl);
      
      // Use raw fetch to avoid any wrapper issues
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ repo_name: repoName })
      });

      // Log detailed response info to debug 404s
      console.log('API response status:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error(`Documentation generation API error: ${response.status} ${response.statusText}`);
        // Check for common status codes
        let errorMsg = 'Failed to generate documentation';
        if (response.status === 404) errorMsg = 'API endpoint not found. Please check server configuration.';
        if (response.status === 401) errorMsg = 'Authentication required. Please reconnect to GitHub.';
        
        return { 
          status: 'error', 
          message: errorMsg
        };
      }

      const data = await response.json();
      
      // If documentation generation was successful, save to Supabase
      if (data.status === 'success') {
        try {
          // Ensure we have a client ID
          ensureClientId();
          const clientId = localStorage.getItem('docster_client_id')!;
          console.log('Saving documentation with client ID:', clientId);
          
          let content;
          if (typeof data.documentation === 'string') {
            try {
              content = JSON.parse(data.documentation);
            } catch {
              content = data.documentation;
            }
          } else {
            content = data.documentation;
          }
          
          // Try direct insert with client ID
          const { data: insertData, error } = await supabase.from('documents').insert({
            user_id: clientId,
            repo_name: repoName,
            content: content,
            created_at: new Date().toISOString()
          });

          if (error) {
            console.error('Error saving documentation to Supabase:', error.message, error.details, error.hint);
          } else {
            console.log('Documentation saved to Supabase successfully');
          }
        } catch (dbError) {
          console.error('Error in Supabase operation:', dbError);
          // Don't fail the overall operation if Supabase saving fails
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error generating documentation:', error);
      return { status: 'error', message: 'Failed to generate documentation. Network error.' };
    }
  },

  getDocumentation: async (repoName: string) => {
    // Check if token exists first
    const token = typeof window !== 'undefined' ? localStorage.getItem('github_token') : null;
    if (!token) {
      console.warn('No token available for getDocumentation');
      return { 
        status: 'error', 
        code: 401,
        message: 'Authentication required. Please connect your GitHub account.' 
      };
    }

    // First try to get from Supabase database
    try {
      // Ensure Supabase authentication
      const isAuthed = await ensureSupabaseAuth();
      if (!isAuthed) {
        console.warn('Failed to authenticate with Supabase, falling back to API');
        // Continue to API fallback
      } else {
        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        let userId = user?.id;
        
        // If no authenticated user but we have a stored anonymous ID, use that
        if (!userId) {
          const storedId = localStorage.getItem('supabase_anon_id') || localStorage.getItem('current_user_id');
          if (storedId) {
            userId = storedId;
            console.log('Using stored user ID for documentation lookup:', userId);
          } else {
            console.warn('No user ID available for getDocumentation');
            // Continue to API fallback
          }
        } else {
          console.log('Using authenticated user ID:', userId);
        }
        
        if (userId) {
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', userId)
            .eq('repo_name', repoName)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (error) {
            console.error('Supabase query error:', error);
          } else if (data && data.length > 0) {
            console.log('Found documentation in Supabase');
            
            // Check if content needs parsing
            let documentation;
            try {
              if (typeof data[0].content === 'string') {
                documentation = JSON.parse(data[0].content);
              } else {
                documentation = data[0].content;
              }
              
              return { 
                status: 'success', 
                documentation
              };
            } catch (parseErr) {
              console.error('Error parsing documentation JSON:', parseErr);
            }
          } else {
            console.log('No documentation found in Supabase for', repoName);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching from Supabase:', err);
    }
    
    // Fall back to API if not in database
    try {
      console.log('Fetching documentation with token:', token ? 'yes' : 'no');
      const response = await authenticatedFetch(`${API_URL}/documentation/get/${repoName}`);
      
      if (!response.ok) {
        console.error(`Documentation API error: ${response.status} ${response.statusText}`);
        return { 
          status: 'error', 
          code: response.status,
          message: response.status === 401 ? 'Authentication required. Please reconnect to GitHub.' : 'Failed to fetch documentation' 
        };
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching documentation:', err);
      return { status: 'error', message: 'Failed to fetch documentation' };
    }
  },

  getUserDocumentations: async () => {
    try {
      // Ensure client ID is available
      const isAuthed = await ensureSupabaseAuth();
      if (!isAuthed) {
        console.error('Failed to ensure auth for getUserDocumentations');
        return { status: 'error', message: 'Authentication required' };
      }
      
      // Get authenticated user or client ID
      const { data: { user } } = await supabase.auth.getUser();
      let userId = user?.id;
      
      if (!userId) {
        const clientId = localStorage.getItem('current_user_id') || localStorage.getItem('docster_client_id');
        if (!clientId) {
          if (!ensureClientId()) {
            console.error('Cannot generate client ID for getUserDocumentations');
            return { status: 'error', message: 'User ID not available' };
          }
          // This should never be null after ensureClientId()
          userId = localStorage.getItem('current_user_id')!;
        } else {
          userId = clientId;
        }
        console.log('Using client ID for documents:', userId);
      } else {
        console.log('Using authenticated user ID:', userId);
      }
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching documents:', error);
        
        // Check if it's a permissions error and try disabling RLS temporarily
        if (error.code === '42501' || error.message.includes('permission denied')) {
          console.log('Permission error, returning empty document list');
          return { 
            status: 'success', 
            documents: [] 
          };
        }
        
        return { status: 'error', message: error.message };
      }
      
      return { 
        status: 'success', 
        documents: data.map((doc: { id: any; repo_name: any; created_at: any; }) => ({
          id: doc.id,
          repo_name: doc.repo_name,
          created_at: doc.created_at
        }))
      };
    } catch (err) {
      console.error('Error fetching user documentations:', err);
      return { status: 'error', message: 'Failed to load documentation history' };
    }
  },

  generateFileDocumentation: async (repoName: string, filePath: string) => {
    const response = await fetch(`${API_URL}/documentation/file`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ repo_name: repoName, file_path: filePath }),
    });
    return response.json();
  },

  exportDocumentation: async (repoName: string, format: 'pdf' | 'docx') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('github_token') : null;
    
    try {
      if (typeof window !== 'undefined') {
        window.open(`${API_URL}/documentation/export?repo_name=${encodeURIComponent(repoName)}&format=${format}&token=${token || ''}`, '_blank');
        return { status: 'success' };
      }
      
      return { status: 'error', message: 'Browser environment required for download' };
    } catch (error) {
      console.error('Download error:', error);
      return { status: 'error', message: 'Failed to download file' };
    }
  },

  queryChat: async (repoName: string, question: string) => {
    try {
      // Get token directly
      const token = localStorage.getItem('github_token');
      if (!token) {
        return { status: 'error', message: 'Authentication required' };
      }
      
      const apiUrl = `${API_URL}/chat/query`;
      console.log('Calling chat query API:', apiUrl);
      
      // Use direct fetch with full error logging
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ repo_name: repoName, question })
      });
      
      console.log('Chat API response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error(`Chat query API error: ${response.status} ${response.statusText}`);
        let errorMsg = 'Failed to query the chat API';
        if (response.status === 404) errorMsg = 'Chat API endpoint not found. Please check server configuration.';
        if (response.status === 401) errorMsg = 'Authentication required. Please reconnect to GitHub.';
        
        return { 
          status: 'error', 
          message: errorMsg
        };
      }

      const data = await response.json();
      
      // Save chat to Supabase if API query was successful
      if (data.status === 'success') {
        try {
          // Ensure we have a client ID
          ensureClientId();
          const clientId = localStorage.getItem('docster_client_id')!;
          console.log('Saving chat with client ID:', clientId);
          
          // Try direct insert with client ID
          const { data: insertData, error } = await supabase.from('chats').insert({
            user_id: clientId,
            repo_name: repoName,
            question: question,
            answer: data.response.answer,
            created_at: new Date().toISOString()
          });
          
          if (error) {
            console.error('Error saving chat to Supabase:', error.message, error.details, error.hint);
          } else {
            console.log('Chat message saved to Supabase successfully');
          }
        } catch (dbError) {
          console.error('Error in Supabase operation:', dbError);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error querying chat:', error);
      return { status: 'error', message: 'Failed to query the chat API. Network error.' };
    }
  },

  getUserChats: async () => {
    try {
      // Ensure client ID is available
      const isAuthed = await ensureSupabaseAuth();
      if (!isAuthed) {
        console.error('Failed to ensure auth for getUserChats');
        return { status: 'error', message: 'Authentication required' };
      }
      
      // Get authenticated user or client ID
      const { data: { user } } = await supabase.auth.getUser();
      let userId = user?.id;
      
      // If no authenticated user, use client ID
      if (!userId) {
        const clientId = localStorage.getItem('current_user_id') || localStorage.getItem('docster_client_id');
        if (!clientId) {
          if (!ensureClientId()) {
            console.error('Cannot generate client ID for getUserChats');
            return { status: 'error', message: 'User ID not available' };
          }
          userId = localStorage.getItem('current_user_id')!;
        } else {
          userId = clientId;
        }
        console.log('Using client ID for chats:', userId);
      } else {
        console.log('Using authenticated user ID:', userId);
      }
      
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching chats:', error);
        
        // Check if it's a permissions error and try disabling RLS temporarily
        if (error.code === '42501' || error.message.includes('permission denied')) {
          console.log('Permission error, returning empty chat list');
          return { 
            status: 'success', 
            chats: [] 
          };
        }
        
        return { status: 'error', message: error.message };
      }
      
      return { 
        status: 'success', 
        chats: data
      };
    } catch (err) {
      console.error('Error fetching user chats:', err);
      return { status: 'error', message: 'Failed to load chat history' };
    }
  },

  getChatsByRepository: async (repoName: string) => {
    try {
      // Ensure client ID is available
      const isAuthed = await ensureSupabaseAuth();
      if (!isAuthed) {
        console.error('Failed to ensure auth for getChatsByRepository');
        return { status: 'error', message: 'Authentication required' };
      }
      
      // Get authenticated user or client ID
      const { data: { user } } = await supabase.auth.getUser();
      let userId = user?.id;
      
      if (!userId) {
        const clientId = localStorage.getItem('current_user_id') || localStorage.getItem('docster_client_id');
        if (!clientId) {
          if (!ensureClientId()) {
            console.error('Cannot generate client ID for getChatsByRepository');
            return { status: 'error', message: 'User ID not available' };
          }
          // This should never be null after ensureClientId()
          userId = localStorage.getItem('current_user_id')!;
        } else {
          userId = clientId;
        }
        console.log('Using client ID for repository chats:', userId);
      } else {
        console.log('Using authenticated user ID:', userId);
      }
      
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .eq('repo_name', repoName)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching repository chats:', error);
        
        // Check if it's a permissions error and try disabling RLS temporarily
        if (error.code === '42501' || error.message.includes('permission denied')) {
          console.log('Permission error, returning empty chat list');
          return { 
            status: 'success', 
            chats: [] 
          };
        }
        
        return { status: 'error', message: error.message };
      }
      
      return { 
        status: 'success', 
        chats: data
      };
    } catch (err) {
      console.error('Error fetching chats by repository:', err);
      return { status: 'error', message: 'Failed to load chat history' };
    }
  },

  requestUpdate: async (repoName: string, filePath: string, suggestion: string) => {
    const response = await fetch(`${API_URL}/chat/update`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ repo_name: repoName, file_path: filePath, suggestion }),
    });
    return response.json();
  },

  getContext: async (repoName: string, query: string) => {
    const response = await fetch(`${API_URL}/chat/context`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ repo_name: repoName, query }),
    });
    return response.json();
  },
};

// Improved Supabase authentication helper function
export const ensureSupabaseAuth = async (): Promise<boolean> => {
  try {
    // Always use client ID approach, skipping Supabase auth completely
    return ensureClientId();
  } catch (err) {
    console.error('Auth check error:', err);
    return ensureClientId();
  }
};

// Function to ensure a client ID is available
const ensureClientId = (): boolean => {
  try {
    // Check if we already have a client ID
    let clientId = localStorage.getItem('docster_client_id');
    
    // If not, generate one and store it
    if (!clientId) {
      clientId = 'client-' + Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
      localStorage.setItem('docster_client_id', clientId);
    }
    
    localStorage.setItem('current_user_id', clientId);
    console.log('Using client-side ID for operations:', clientId);
    
    return true;
  } catch (err) {
    console.error('Client ID generation error:', err);
    return false;
  }
}; 