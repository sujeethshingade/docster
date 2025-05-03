# Deployment Guide for Docster

This guide provides detailed instructions for deploying the Docster application to production environments.

## Code Changes Required

### Client-Side (Next.js)

1. **Create `client/src/config.ts`**:
```typescript
// Environment configuration
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// GitHub configuration
export const GITHUB_REDIRECT_URL = process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URL || 'http://localhost:3000/github/connected';
```

2. **Update `client/src/services/api.ts`**:
```typescript
// Change the first line from
const API_URL = 'http://localhost:5000/api';
// to
import { API_URL } from '../config';
```

3. **Update all pages with hardcoded URLs** like `client/src/app/github/connect/page.tsx`:
```typescript
// Replace direct fetch calls like:
const response = await fetch('http://localhost:5000/api/github/connect', {...});

// With API service calls:
import { api } from '../../../services/api';
const data = await api.connectGitHub();
```

4. **Create environment files**:

For development (`client/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GITHUB_REDIRECT_URL=http://localhost:3000/github/connected
```

For production (`client/.env.production`):
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
NEXT_PUBLIC_GITHUB_REDIRECT_URL=https://your-frontend-url.com/github/connected
```

### Server-Side (Flask)

1. **Update CORS configuration** in `server/app.py`:
```python
# The current configuration looks good:
CORS(app, origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')])
```

2. **Update `.env` file** for production with:
```
GEMINI_API_KEY=your-gemini-api-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=https://your-backend-url.com/api/github/callback
FRONTEND_URL=https://your-frontend-url.com
PORT=5000
```

3. **Update GitHub OAuth settings** in GitHub Developer settings:
   - Update callback URL to: `https://your-backend-url.com/api/github/callback`
   - Update homepage URL to: `https://your-frontend-url.com`

## Deployment Process

### Next.js Frontend on Vercel

1. Push your code to GitHub
2. Connect repository to Vercel
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL
   - `NEXT_PUBLIC_GITHUB_REDIRECT_URL`: Your frontend URL + "/github/connected"
4. Deploy

### Flask Backend Options

#### Option 1: Deploy to Render

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect to your repository
4. Configure:
   - Environment: Python 3.8+
   - Build command: `pip install -r server/requirements.txt`
   - Start command: `cd server && gunicorn app:app`
   - Add environment variables from your `.env` file
5. Deploy

#### Option 2: Deploy to Railway

1. Push your code to GitHub
2. Create a new project on Railway
3. Add a Python service
4. Connect to your repository
5. Configure:
   - Root directory: `/server`
   - Start command: `gunicorn app:app`
   - Add environment variables from your `.env` file
6. Deploy

#### Option 3: Deploy to Heroku

1. Create a Procfile in the server directory:
   ```
   web: gunicorn app:app
   ```
2. Push your code to GitHub
3. Create a new app on Heroku
4. Connect to your repository
5. Configure buildpack for Python
6. Add environment variables from your `.env` file
7. Deploy

## Post-Deployment Checklist

1. Test GitHub OAuth flow with deployed URLs
2. Verify documentation generation works
3. Test chat functionality
4. Check PDF/DOCX export functionality
5. Verify proper CORS handling between client and server

## Troubleshooting Common Issues

- **CORS errors**: Verify that your FRONTEND_URL is correctly set in server environment
- **GitHub OAuth errors**: Check that callback URLs match exactly in GitHub settings and .env
- **API connection failures**: Verify API_URL is correct in client environment
- **Missing environment variables**: Check that all required variables are set in your hosting environment
