import os
import json
import logging
from datetime import datetime


class DocumentationService:
    def __init__(self, github_service, ai_service):
        self.github_service = github_service
        self.ai_service = ai_service
        self.storage_dir = os.path.join(os.path.dirname(
            os.path.dirname(__file__)), 'data', 'docs')
        os.makedirs(self.storage_dir, exist_ok=True)
        logging.basicConfig(level=logging.DEBUG)
        self.logger = logging.getLogger(__name__)

    def generate_file_documentation(self, repo_name, file_path):
        """Generate documentation for a specific file"""
        try:
            self.logger.debug(
                f"Generating documentation for file: {file_path} in repo: {repo_name}")
            # Get file content
            file_content = self.github_service.get_repository_contents(
                repo_name, file_path)
            if isinstance(file_content, list):
                # This is a directory, not a file
                self.logger.warning(f"Skipping directory: {file_path}")
                return None

            # Extract content
            code_content = file_content.decoded_content.decode('utf-8')
            self.logger.debug(
                f"Retrieved content for {file_path}, size: {len(code_content)} bytes")

            # Generate documentation using AI
            self.logger.debug(f"Sending file {file_path} to AI for analysis")
            documentation = self.ai_service.analyze_code(
                code_content, file_path)
            self.logger.debug(f"Documentation generated for {file_path}")

            return {
                'file_path': file_path,
                'documentation': documentation,
                'generated_at': datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(
                f"Error generating documentation for {file_path}: {str(e)}", exc_info=True)
            return None

    def generate_repository_documentation(self, repo_name):
        """Generate comprehensive documentation for an entire repository"""
        try:
            self.logger.info(
                f"Starting documentation generation for repository: {repo_name}")

            # Get repository data
            self.logger.debug("Fetching repository data")
            repo = self.github_service.get_repository(repo_name)
            self.logger.debug(f"Repository fetched: {repo.name}")

            # Get repository structure
            self.logger.debug("Fetching repository structure")
            contents = self.github_service.get_repository_contents(repo_name)
            self.logger.debug(f"Retrieved {len(contents)} top-level items")

            structure = self._build_repo_structure(repo_name, contents)
            self.logger.debug("Repository structure built")

            # Generate repository summary
            self.logger.debug(
                "Preparing repository data for summary generation")
            repo_data = {
                'name': repo.name,
                'description': repo.description,
                'language': repo.language,
                'topics': repo.get_topics(),
                'structure': structure
            }

            self.logger.debug("Generating repository summary with AI")
            summary = self.ai_service.generate_repository_summary(repo_data)
            self.logger.debug("Repository summary generated")

            # Process key files for documentation
            self.logger.debug("Identifying important files for documentation")
            important_files = self._get_important_files(repo_name, contents)
            self.logger.debug(
                f"Found {len(important_files)} important files to document")

            file_docs = []
            for file_path in important_files:
                self.logger.debug(f"Processing file: {file_path}")
                file_doc = self.generate_file_documentation(
                    repo_name, file_path)
                if file_doc:
                    file_docs.append(file_doc)
                    self.logger.debug(f"Added documentation for {file_path}")
                else:
                    self.logger.warning(
                        f"Failed to generate documentation for {file_path}")

            # Compile full documentation
            self.logger.debug("Compiling complete documentation")
            documentation = {
                'repository': {
                    'name': repo.name,
                    'owner': repo.owner.login,
                    'url': repo.html_url,
                    'description': repo.description,
                    'summary': summary
                },
                'files': file_docs,
                'generated_at': datetime.now().isoformat()
            }

            # Save documentation
            self.logger.debug("Saving documentation to disk")
            self._save_documentation(repo_name, documentation)
            self.logger.info(
                f"Documentation generation completed for {repo_name}")

            return documentation
        except Exception as e:
            self.logger.error(
                f"Error generating repository documentation: {str(e)}", exc_info=True)
            return None

    def generate_documentation(self, repo_name):
        """Generate documentation including Mermaid diagrams"""
        try:
            self.logger.info(
                f"Starting documentation generation with diagrams for repository: {repo_name}")

            self.logger.debug("Analyzing repository")
            code_analysis = self.analyze_repository(repo_name)
            self.logger.debug("Repository analysis completed")

            self.logger.debug("Generating Mermaid diagram")
            flow_diagram = self.ai_service.generate_mermaid_diagram(code_analysis)
            self.logger.debug("Mermaid diagram generated")

            documentation = self.generate_repository_documentation(repo_name)
            documentation['diagrams'] = {
                'flow': flow_diagram
            }

            self.logger.info(
                f"Documentation with diagrams generation completed for {repo_name}")
            return documentation
        except Exception as e:
            self.logger.error(
                f"Error generating documentation with diagrams: {str(e)}", exc_info=True)
            return None

    def analyze_repository(self, repo_name):
        """Analyze repository for diagram generation"""
        try:
            self.logger.debug(f"Analyzing repository structure: {repo_name}")
            
            # Get repository data
            repo = self.github_service.get_repository(repo_name)
            contents = self.github_service.get_repository_contents(repo_name)
            
            # Build file list for analysis
            important_files = self._get_important_files(repo_name, contents)
            
            # Collect code content for analysis
            code_analysis = []
            for file_path in important_files:
                try:
                    file_content = self.github_service.get_repository_contents(repo_name, file_path)
                    if not isinstance(file_content, list):  # Skip directories
                        content = file_content.decoded_content.decode('utf-8')
                        code_analysis.append({
                            'file': file_path,
                            'content': content
                        })
                except Exception as e:
                    self.logger.warning(f"Error analyzing {file_path}: {str(e)}")
                    continue
            
            # Create analysis summary
            analysis_summary = {
                'repository': repo.name,
                'files': code_analysis,
                'structure': self._build_repo_structure(repo_name, contents)
            }
            
            self.logger.debug(f"Repository analysis completed for {repo_name}")
            return analysis_summary
            
        except Exception as e:
            self.logger.error(f"Error during repository analysis: {str(e)}", exc_info=True)
            raise

    def _build_repo_structure(self, repo_name, contents, path=""):
        """Recursively build repository structure"""
        structure = []

        for content in contents:
            if content.type == "dir":
                dir_contents = self.github_service.get_repository_contents(
                    repo_name, content.path)
                dir_structure = self._build_repo_structure(
                    repo_name, dir_contents, content.path)
                structure.append({
                    'type': 'directory',
                    'name': content.name,
                    'path': content.path,
                    'contents': dir_structure
                })
            else:
                structure.append({
                    'type': 'file',
                    'name': content.name,
                    'path': content.path,
                    'size': content.size
                })

        return structure

    def _get_important_files(self, repo_name, contents, path=""):
        """Identify important files for documentation"""
        important_files = []

        # Helper function to process contents
        def process_contents(contents, current_path=""):
            files = []
            for content in contents:
                if content.type == "dir":
                    # Skip certain directories
                    if content.name.lower() in ['.git', 'node_modules', 'venv', 'dist', 'build']:
                        continue

                    # Process subdirectory
                    dir_contents = self.github_service.get_repository_contents(
                        repo_name, content.path)
                    files.extend(process_contents(dir_contents, content.path))
                else:
                    # Check file extension
                    _, ext = os.path.splitext(content.name.lower())

                    # Include important files
                    if content.name.lower() in ['readme.md', 'contributing.md', 'license', 'dockerfile', '.env.example']:
                        files.append(content.path)
                    # Include code files
                    elif ext in ['.py', '.js', '.jsx', '.ts', '.tsx', '.go', '.java', '.rb', '.php', '.c', '.cpp', '.h', '.hpp']:
                        files.append(content.path)
            return files

        important_files = process_contents(contents)
        return important_files

    def _save_documentation(self, repo_name, documentation):
        """Save documentation to disk"""
        # Create directory for repository
        repo_dir = os.path.join(self.storage_dir, repo_name.replace('/', '_'))
        os.makedirs(repo_dir, exist_ok=True)

        # Save full documentation
        doc_path = os.path.join(repo_dir, 'documentation.json')
        with open(doc_path, 'w') as f:
            json.dump(documentation, f, indent=2)

        # Create markdown version
        markdown_content = self._generate_markdown(documentation)
        md_path = os.path.join(repo_dir, 'documentation.md')
        with open(md_path, 'w') as f:
            f.write(markdown_content)

        return doc_path, md_path

    def _generate_markdown(self, documentation):
        """Generate markdown documentation from JSON structure"""
        md = []

        # Title
        md.append(f"# {documentation['repository']['name']} Documentation")
        md.append("")

        # Repository info
        md.append("## Repository")
        md.append("")
        md.append(f"**Name:** {documentation['repository']['name']}")
        md.append(f"**Owner:** {documentation['repository']['owner']}")
        md.append(f"**URL:** {documentation['repository']['url']}")
        md.append(
            f"**Description:** {documentation['repository']['description']}")
        md.append("")

        # Summary
        md.append("## Summary")
        md.append("")
        md.append(documentation['repository']['summary'])
        md.append("")

        # Files
        md.append("## Files")
        md.append("")

        for file_doc in documentation['files']:
            md.append(f"### {file_doc['file_path']}")
            md.append("")
            md.append(file_doc['documentation'])
            md.append("")

        # Diagrams
        if 'diagrams' in documentation:
            md.append("## Diagrams")
            md.append("")
            md.append("### Flow Diagram")
            md.append("")
            md.append(f"```mermaid\n{documentation['diagrams']['flow']}\n```")
            md.append("")

        # Generation info
        md.append("---")
        md.append(f"Generated at: {documentation['generated_at']}")

        return "\n".join(md)

    def get_documentation(self, repo_name):
        """Retrieve stored documentation for a repository"""
        repo_dir = os.path.join(self.storage_dir, repo_name.replace('/', '_'))
        doc_path = os.path.join(repo_dir, 'documentation.json')

        if os.path.exists(doc_path):
            with open(doc_path, 'r') as f:
                return json.load(f)

        return None
