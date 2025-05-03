from flask import Blueprint, request, jsonify, session, redirect, url_for
import os
from services.github_service import GitHubService

github_bp = Blueprint('github', __name__, url_prefix='/api/github')
github_service = GitHubService()


@github_bp.route('/connect', methods=['POST'])
def connect():
    """Initiate GitHub connection"""
    try:
        client_id = os.environ.get('GITHUB_CLIENT_ID')
        redirect_uri = os.environ.get('GITHUB_REDIRECT_URI')

        if not client_id:
            return jsonify({
                'status': 'error',
                'message': 'GitHub Client ID not configured'
            }), 500

        data = request.get_json(silent=True) or {}

        if data and 'access_token' in data:
            github_service.access_token = data['access_token']
            return jsonify({
                'status': 'success',
                'message': 'Connected to GitHub API'
            })

        oauth_url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=repo"
        return jsonify({
            'status': 'redirect',
            'url': oauth_url
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f"GitHub connection error: {str(e)}"
        }), 500


@github_bp.route('/callback', methods=['GET'])
def callback():
    """Handle OAuth callback"""
    try:
        code = request.args.get('code')
        if not code:
            return jsonify({
                'status': 'error',
                'message': 'No code provided'
            }), 400

        access_token = github_service.authenticate(code)
        if not access_token:
            return jsonify({
                'status': 'error',
                'message': 'Failed to get access token'
            }), 401

        session['github_token'] = access_token

        # Redirect to frontend
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/github/connected?token={access_token}")
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@github_bp.route('/repositories', methods=['GET'])
def get_repositories():
    """Get user repositories"""
    try:
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token.split(' ')[1]
        else:
            token = session.get('github_token')

        if not token:
            return jsonify({
                'status': 'error',
                'message': 'Not authenticated'
            }), 401

        github_service.access_token = token

        github = github_service.github
        user = github.get_user()
        repos = [
            {
                'name': repo.name,
                'full_name': repo.full_name,
                'description': repo.description,
                'url': repo.html_url,
                'language': repo.language
            }
            for repo in user.get_repos()
        ]

        return jsonify({
            'status': 'success',
            'repositories': repos
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@github_bp.route('/repository/<path:repo_name>', methods=['GET'])
def get_repository(repo_name):
    """Get repository details"""
    try:
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token.split(' ')[1]
        else:
            token = session.get('github_token')

        if not token:
            return jsonify({
                'status': 'error',
                'message': 'Not authenticated'
            }), 401

        github_service.access_token = token

        repo = github_service.get_repository(repo_name)

        contents = github_service.get_repository_contents(repo_name)
        structure = []

        for content in contents:
            item = {
                'name': content.name,
                'path': content.path,
                'type': content.type,
                'size': getattr(content, 'size', 0),
                'url': getattr(content, 'html_url', '')
            }
            structure.append(item)

        return jsonify({
            'status': 'success',
            'repository': {
                'name': repo.name,
                'full_name': repo.full_name,
                'description': repo.description,
                'url': repo.html_url,
                'language': repo.language,
                'default_branch': repo.default_branch,
                'stars': repo.stargazers_count,
                'forks': repo.forks_count,
                'structure': structure
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
