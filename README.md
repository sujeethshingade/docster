# Docster

An AI-powered documentation tool that automates the generation, maintenance, and interaction of high-quality documentation for GitHub repositories.

## Features

- Automated documentation generation from code, commits, PRs, and issues
- Downloadable outputs in PDF and Word formats
- Interactive Q&A with documentation chatbot
- Summarized documentation with high-level overviews

## Technology Stack

### Frontend

- Next.js (React framework)
- Tailwind CSS for styling
- TypeScript

### Backend

- Flask (Python web framework)
- Google Gemini API for AI capabilities
- GitHub API integration via PyGithub
- PDF and DOCX export functionality

## Project Structure

- `/client` - Next.js frontend application
- `/server` - Flask backend API
  - `/server/services` - Core service modules
  - `/server/routes` - API endpoints
  - `/server/data` - Storage for generated documentation

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- GitHub Account (for API integration)
- Google Gemini API key

### Setting Up GitHub OAuth

1. Go to your GitHub account settings
2. Navigate to Developer Settings > OAuth Apps
3. Create a new OAuth App with:
   - Application name: Docster
   - Homepage URL: http://localhost:3000
   - Authorization callback URL: http://localhost:5000/api/github/callback

### API Keys Setup

Create a `.env` file in the `/server` directory with:

```
GEMINI_API_KEY=your-gemini-api-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:5000/api/github/callback
FRONTEND_URL=http://localhost:3000
FLASK_ENV=development
PORT=5000
```

### Installation

#### Client

```bash
cd client
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

#### Server

```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

The backend API will run at http://localhost:5000
