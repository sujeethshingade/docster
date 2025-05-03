import os
import json
from datetime import datetime


class ChatService:
    def __init__(self, github_service, ai_service, documentation_service):
        self.github_service = github_service
        self.ai_service = ai_service
        self.documentation_service = documentation_service
        self.storage_dir = os.path.join(os.path.dirname(
            os.path.dirname(__file__)), 'data', 'chats')
        os.makedirs(self.storage_dir, exist_ok=True)

    def get_context_for_query(self, repo_name, query):
        """Get relevant context from documentation for a query"""
        documentation = self.documentation_service.get_documentation(repo_name)
        if not documentation:
            return "No documentation available for this repository."

        relevant_context = []

        relevant_context.append(
            f"Repository: {documentation['repository']['name']}")
        relevant_context.append(
            f"Description: {documentation['repository']['description']}")
        relevant_context.append(
            f"Summary: {documentation['repository']['summary']}")

        # Check for keyword matches in file documentation
        for file_doc in documentation['files']:
            if any(keyword in file_doc['file_path'].lower() for keyword in query.lower().split()):
                relevant_context.append(f"File: {file_doc['file_path']}")
                relevant_context.append(file_doc['documentation'])
            elif any(keyword in file_doc['documentation'].lower() for keyword in query.lower().split()):
                relevant_context.append(f"File: {file_doc['file_path']}")
                relevant_context.append(file_doc['documentation'])

        return "\n\n".join(relevant_context)

    def answer_question(self, repo_name, question):
        """Answer a question about a repository"""
        context = self.get_context_for_query(repo_name, question)

        answer = self.ai_service.answer_question(question, context)

        self._save_conversation(repo_name, question, answer)

        return {
            'question': question,
            'answer': answer,
            'repo_name': repo_name,
            'timestamp': datetime.now().isoformat()
        }

    def request_documentation_update(self, repo_name, file_path, suggestion):
        """Request an update to documentation for a specific file"""
        documentation = self.documentation_service.get_documentation(repo_name)
        if not documentation:
            return {
                'status': 'error',
                'message': 'No documentation available for this repository.'
            }

        file_doc = None
        for doc in documentation['files']:
            if doc['file_path'] == file_path:
                file_doc = doc
                break

        if not file_doc:
            return {
                'status': 'error',
                'message': f'No documentation found for file: {file_path}'
            }

        return {
            'status': 'success',
            'message': f'Documentation update requested for {file_path}',
            'suggestion': suggestion
        }

    def _save_conversation(self, repo_name, question, answer):
        """Save conversation to disk"""
        repo_dir = os.path.join(self.storage_dir, repo_name.replace('/', '_'))
        os.makedirs(repo_dir, exist_ok=True)

        timestamp = datetime.now().isoformat().replace(':', '-')
        conversation_file = os.path.join(
            repo_dir, f'conversation_{timestamp}.json')

        conversation = {
            'repo_name': repo_name,
            'question': question,
            'answer': answer,
            'timestamp': timestamp
        }

        with open(conversation_file, 'w') as f:
            json.dump(conversation, f, indent=2)

        return conversation_file
