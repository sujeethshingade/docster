export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const GITHUB_REDIRECT_URL = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URL || 'http://localhost:3000/github/connected';

console.log('API URL configured as:', API_URL);