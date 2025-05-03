import { API_URL } from '../config';

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('github_token');
  }
  return null;
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
  connectGitHub: async () => {
    const response = await fetch(`${API_URL}/github/connect`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return response.json();
  },

  getRepositories: async () => {
    const response = await fetch(`${API_URL}/github/repositories`, {
      headers: getHeaders(),
    });
    return response.json();
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
    return response.json();
  },

  getDocumentation: async (repoName: string) => {
    const response = await fetch(`${API_URL}/documentation/get/${repoName}`, {
      headers: getHeaders(),
    });
    return response.json();
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
    return response.json();
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