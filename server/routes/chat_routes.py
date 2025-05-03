from flask import Blueprint, request, jsonify, session
from services.github_service import GitHubService
from services.ai_service import AIService
from services.documentation_service import DocumentationService
from services.chat_service import ChatService

chat_bp = Blueprint('chat', __name__, url_prefix='/api/chat')

github_service = GitHubService()
ai_service = AIService()
documentation_service = DocumentationService(github_service, ai_service)
chat_service = ChatService(github_service, ai_service, documentation_service)


@chat_bp.route('/query', methods=['POST'])
def query():
    """Answer a question about a repository"""
    try:
        data = request.json
        repo_name = data.get('repo_name')
        question = data.get('question')

        if not repo_name or not question:
            return jsonify({
                'status': 'error',
                'message': 'Repository name and question are required'
            }), 400

        response = chat_service.answer_question(repo_name, question)

        return jsonify({
            'status': 'success',
            'response': response
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@chat_bp.route('/update', methods=['POST'])
def request_update():
    """Request an update to documentation"""
    try:
        data = request.json
        repo_name = data.get('repo_name')
        file_path = data.get('file_path')
        suggestion = data.get('suggestion')

        if not repo_name or not file_path or not suggestion:
            return jsonify({
                'status': 'error',
                'message': 'Repository name, file path, and suggestion are required'
            }), 400

        # Check if token in header or session
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

        # Initialize service with token
        github_service.access_token = token

        response = chat_service.request_documentation_update(
            repo_name, file_path, suggestion)

        return jsonify({
            'status': 'success',
            'response': response
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@chat_bp.route('/context', methods=['POST'])
def get_context():
    """Get relevant context for a query"""
    try:
        data = request.json
        repo_name = data.get('repo_name')
        query = data.get('query')

        if not repo_name or not query:
            return jsonify({
                'status': 'error',
                'message': 'Repository name and query are required'
            }), 400

        context = chat_service.get_context_for_query(repo_name, query)

        return jsonify({
            'status': 'success',
            'context': context
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
