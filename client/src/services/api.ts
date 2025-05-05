import { API_URL } from './config';
import { supabase } from './supabase';

// Create a consistent auth check function
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    // Check both user_authenticated flag and github_token
    const userAuthFlag = localStorage.getItem('user_authenticated') === 'true';
    const hasGithubToken = localStorage.getItem('github_token') !== null;
    
    // If we have a GitHub token but not authenticated with Supabase yet,
    // give a bit more time for Supabase auth to complete
    if (hasGithubToken && !userAuthFlag) {
      // Set the flag anyway since we have a token
      localStorage.setItem('user_authenticated', 'true');
    }
    
    // First check Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    
    // If we have a GitHub token but no Supabase user yet, consider authenticated 
    // (the Supabase user will be created shortly)
    const isAuth = (!!user && hasGithubToken) || (hasGithubToken && userAuthFlag);
    
    // Update localStorage to match the real auth state
    updateAuthState(isAuth);
    
    return isAuth;
  } catch (err) {
    console.error('Auth check error:', err);
    
    // Fall back to checking local storage as a last resort
    const hasGithubToken = localStorage.getItem('github_token') !== null;
    const userAuthFlag = localStorage.getItem('user_authenticated') === 'true';
    
    // If we have both indicators, consider authenticated despite the error
    if (hasGithubToken && userAuthFlag) {
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
    if (isAuthenticated) {
      localStorage.setItem('user_authenticated', 'true');
    } else {
      localStorage.removeItem('user_authenticated');
      localStorage.removeItem('github_token'); // Also clear token to ensure consistency
      localStorage.removeItem('github_username'); // Also clear username
    }
    
    // Notify all components about the change
    notifyAuthChange();
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

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
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
        // Store the token
        localStorage.setItem('github_token', data.token);
        localStorage.setItem('user_authenticated', 'true');
        
        // Update auth state
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
        
        // Notify all components about auth change
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
      
      // Clear local storage token regardless of response
      updateAuthState(false);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      return response.json();
    } catch (err) {
      console.error('Error logging out from GitHub:', err);
      updateAuthState(false);
      return { status: 'error', message: 'Failed to logout' };
    }
  },

  getRepositories: async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        return { 
          status: 'error', 
          message: 'Authentication required. Please connect your GitHub account.'
        };
      }

      const response = await fetch(`${API_URL}/github/repositories`, {
        headers: getHeaders(),
      });
      const data = await response.json();
      
      // If we get an unauthorized error, clear auth state
      if (data.status === 'error' && (data.code === 401 || data.message?.includes('unauthorized'))) {
        updateAuthState(false);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching repositories:', error);
      return { 
        status: 'error', 
        message: 'Failed to fetch repositories. Please try again.' 
      };
    }
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
    // First try to get from Supabase database
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
    
    // Fall back to API if not in database
    const response = await fetch(`${API_URL}/documentation/get/${repoName}`, {
      headers: getHeaders(),
    });
    return response.json();
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
    const token = getAuthToken();
    
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