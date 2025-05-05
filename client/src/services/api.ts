import { API_URL } from './config';
import { supabase } from './supabase';

// Create a consistent auth check function
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    // Check both user_authenticated flag and github_token
    const userAuthFlag = localStorage.getItem('user_authenticated') === 'true';
    const hasGithubToken = localStorage.getItem('github_token') !== null;
    
    if (hasGithubToken && !userAuthFlag) {
      localStorage.setItem('user_authenticated', 'true');
    }
    
    if (!hasGithubToken) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateAuthState(true);
          return true;
        }
      } catch (err) {
        console.error('Supabase auth check error:', err);
      }
    }
    
    // If GitHub token exists, consider authenticated regardless of Supabase state
    if (hasGithubToken) {
      return true;
    }
    
    updateAuthState(false);
    return false;
  } catch (err) {
    console.error('Auth check error:', err);
    
    const hasGithubToken = localStorage.getItem('github_token') !== null;
    
    if (hasGithubToken) {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      updateAuthState(true);
      return user;
    } else {
      updateAuthState(false);
      return null;
    }
  } catch (err) {
    console.error('Error getting current user:', err);
    updateAuthState(false);
    return null;
  }
};

// Create an authenticated fetch wrapper
const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Always get a fresh token for each request
  const token = typeof window !== 'undefined' ? localStorage.getItem('github_token') : null;
  
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
    
    // Don't clear auth on 401 errors - let the component handle them
    return response;
  } catch (err) {
    console.error('Request error:', err);
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
    const response = await fetch(`${API_URL}/documentation/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ repo_name: repoName }),
    });
    const data = await response.json();
    
    // If documentation generation was successful, save to Supabase
    if (data.status === 'success') {
      const user = await getCurrentUser();
      if (user) {
        // Store documentation in Supabase
        await supabase.from('documents').insert({
          user_id: user.id,
          repo_name: repoName,
          content: JSON.stringify(data.documentation),
          created_at: new Date().toISOString()
        });
      }
    }
    
    return data;
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
      const user = await getCurrentUser();
      if (user) {
        const { data } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .eq('repo_name', repoName)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          return { 
            status: 'success', 
            documentation: JSON.parse(data[0].content) 
          };
        }
      }
    } catch (err) {
      console.error('Error fetching from Supabase:', err);
      // Continue to API fallback
    }
    
    // Fall back to API if not in database
    try {
      console.log('Fetching documentation with token:', token ? 'yes' : 'no');
      const response = await authenticatedFetch(`${API_URL}/documentation/get/${repoName}`);
      
      if (!response.ok) {
        console.error(`Documentation API error: ${response.status} ${response.statusText}`);
        // Never clear auth state on API errors
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
      // Never clear auth state on errors
      return { status: 'error', message: 'Failed to fetch documentation' };
    }
  },

  getUserDocumentations: async () => {
    const user = await getCurrentUser();
    if (!user) return { status: 'error', message: 'User not authenticated' };
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching documents:', error);
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
    const response = await fetch(`${API_URL}/chat/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ repo_name: repoName, question }),
    });
    const data = await response.json();
    
    // Save chat to Supabase
    if (data.status === 'success') {
      const user = await getCurrentUser();
      if (user) {
        await supabase.from('chats').insert({
          user_id: user.id,
          repo_name: repoName,
          question: question,
          answer: data.response.answer,
          created_at: new Date().toISOString()
        });
      }
    }
    
    return data;
  },

  getUserChats: async () => {
    const user = await getCurrentUser();
    if (!user) return { status: 'error', message: 'User not authenticated' };
    
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching chats:', error);
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
    const user = await getCurrentUser();
    if (!user) return { status: 'error', message: 'User not authenticated' };
    
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .eq('repo_name', repoName)
      .order('created_at', { ascending: true });
    
    if (error) return { status: 'error', message: error.message };
    
    return { 
      status: 'success', 
      chats: data
    };
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