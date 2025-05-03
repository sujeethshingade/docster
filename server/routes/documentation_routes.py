from flask import Blueprint, request, jsonify, session, send_file
import os
import tempfile
from services.github_service import GitHubService
from services.ai_service import AIService
from services.documentation_service import DocumentationService
from services.export_service import ExportService

documentation_bp = Blueprint(
    'documentation', __name__, url_prefix='/api/documentation')

github_service = GitHubService()
ai_service = AIService()
documentation_service = DocumentationService(github_service, ai_service)
export_service = ExportService()


@documentation_bp.route('/generate', methods=['POST'])
def generate():
    """Generate documentation for a repository"""
    try:
        data = request.json
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Missing request data'
            }), 400

        repo_name = data.get('repo_name')

        if not repo_name:
            return jsonify({
                'status': 'error',
                'message': 'Repository name is required'
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
                'message': 'GitHub authentication required. Please connect to GitHub first.'
            }), 401

        github_service.access_token = token

        # Validate GitHub token works
        if not github_service.github:
            return jsonify({
                'status': 'error',
                'message': 'Failed to initialize GitHub client. Please reconnect to GitHub.'
            }), 401

        try:
            user = github_service.github.get_user()
            user_login = user.login
            print(f"Authenticated as GitHub user: {user_login}")
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'GitHub authentication error: {str(e)}'
            }), 401

        try:
            repo = github_service.get_repository(repo_name)
            print(f"Successfully accessed repository: {repo.full_name}")
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Repository access error: {str(e)}. Make sure the repository exists and you have access to it.'
            }), 404

        try:
            documentation = documentation_service.generate_repository_documentation(
                repo_name)
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Error during documentation generation: {str(e)}'
            }), 500

        if not documentation:
            return jsonify({
                'status': 'error',
                'message': 'Failed to generate documentation. Check server logs for details.'
            }), 500

        return jsonify({
            'status': 'success',
            'message': 'Documentation generated successfully',
            'documentation': documentation
        })
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Documentation generation error: {str(e)}\n{error_details}")
        return jsonify({
            'status': 'error',
            'message': f'Error: {str(e)}'
        }), 500


@documentation_bp.route('/get/<path:repo_name>', methods=['GET'])
def get_documentation(repo_name):
    """Get documentation for a repository"""
    try:
        documentation = documentation_service.get_documentation(repo_name)

        if not documentation:
            return jsonify({
                'status': 'error',
                'message': 'No documentation found for this repository'
            }), 404

        return jsonify({
            'status': 'success',
            'documentation': documentation
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@documentation_bp.route('/export', methods=['POST'])
def export():
    """Export documentation to PDF or Word"""
    try:
        data = request.json
        repo_name = data.get('repo_name')
        format_type = data.get('format', 'pdf').lower()

        if not repo_name:
            return jsonify({
                'status': 'error',
                'message': 'Repository name is required'
            }), 400

        if format_type not in ['pdf', 'docx']:
            return jsonify({
                'status': 'error',
                'message': 'Unsupported format. Supported formats: pdf, docx'
            }), 400

        documentation = documentation_service.get_documentation(repo_name)

        if not documentation:
            return jsonify({
                'status': 'error',
                'message': 'No documentation found for this repository'
            }), 404

        # Generate markdown content from documentation
        markdown_content = documentation_service._generate_markdown(
            documentation)

        # Create temporary file for export
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{format_type}') as temp_file:
            temp_path = temp_file.name

        # Export to the specified format
        output_path = export_service.export_documentation(
            markdown_content, format_type, temp_path)

        # Return file for download
        return send_file(
            output_path,
            as_attachment=True,
            download_name=f"{repo_name.replace('/', '_')}_documentation.{format_type}",
            mimetype='application/pdf' if format_type == 'pdf' else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@documentation_bp.route('/file', methods=['POST'])
def generate_file_documentation():
    """Generate documentation for a specific file"""
    try:
        data = request.json
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'Missing request data'
            }), 400

        repo_name = data.get('repo_name')
        file_path = data.get('file_path')

        if not repo_name or not file_path:
            return jsonify({
                'status': 'error',
                'message': 'Repository name and file path are required'
            }), 400

        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token.split(' ')[1]
        else:
            token = session.get('github_token')

        if not token:
            return jsonify({
                'status': 'error',
                'message': 'GitHub authentication required. Please connect to GitHub first.'
            }), 401

        github_service.access_token = token

        if not github_service.github:
            return jsonify({
                'status': 'error',
                'message': 'Failed to initialize GitHub client. Please reconnect to GitHub.'
            }), 401

        try:
            user = github_service.github.get_user()
            user_login = user.login
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'GitHub authentication error: {str(e)}'
            }), 401

        # Test repository and file access
        try:
            repo = github_service.get_repository(repo_name)
            file_content = github_service.get_repository_contents(
                repo_name, file_path)
            if isinstance(file_content, list):
                return jsonify({
                    'status': 'error',
                    'message': f'The specified path is a directory, not a file: {file_path}'
                }), 400
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Repository or file access error: {str(e)}. Make sure the repository and file exist and you have access to them.'
            }), 404

        # Generate file documentation
        try:
            documentation = documentation_service.generate_file_documentation(
                repo_name, file_path)
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Error during file documentation generation: {str(e)}'
            }), 500

        if not documentation:
            return jsonify({
                'status': 'error',
                'message': 'Failed to generate documentation for the file. Check server logs for details.'
            }), 500

        return jsonify({
            'status': 'success',
            'documentation': documentation
        })
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(
            f"File documentation generation error: {str(e)}\n{error_details}")
        return jsonify({
            'status': 'error',
            'message': f'Error: {str(e)}'
        }), 500
