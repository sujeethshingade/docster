import os
import time
import logging
import json
import google.generativeai as genai
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI


class AIService:
    def __init__(self):
        logging.basicConfig(level=logging.DEBUG)
        self.logger = logging.getLogger(__name__)

        api_key = self._get_api_key()

        if api_key:
            masked_key = f"{'*' * (len(api_key) - 4)}{api_key[-4:]}" if len(
                api_key) > 4 else "****"
            self.logger.debug(
                f"Initializing AI service with API key: {masked_key}")
        else:
            self.logger.error(
                "GEMINI_API_KEY not found in environment variables or config")
            api_key = None

        if not api_key:
            self.logger.error(
                "Unable to initialize Gemini service: Missing API key")
            self.model = None
            self.llm = None
            return

        try:
            genai.configure(api_key=api_key)

            self.generation_config = {
                "temperature": 0.1,
                "top_p": 0.95,
                "top_k": 0,
                "max_output_tokens": 2048,
            }

            model_names = ["gemini-2.0-flash", "gemini-1.5-flash"]
            model_error = None

            for model_name in model_names:
                try:
                    self.model = genai.GenerativeModel(
                        model_name=model_name,
                        generation_config=self.generation_config
                    )
                    test_response = self.model.generate_content("Test")
                    self.logger.debug(f"Successfully initialized {model_name}")
                    self.model_name = model_name
                    break
                except Exception as e:
                    model_error = str(e)
                    self.logger.warning(
                        f"Could not initialize {model_name}: {str(e)}")
                    continue

            if not hasattr(self, 'model_name'):
                raise Exception(
                    f"Failed to initialize any Gemini model. Last error: {model_error}")

            self.logger.debug(
                f"Gemini client initialized successfully with model {self.model_name}")

            self.llm = ChatGoogleGenerativeAI(
                model=self.model_name,
                google_api_key=api_key,
                temperature=0.1
            )
            self.logger.debug("LangChain LLM initialized successfully")
        except Exception as e:
            self.logger.error(
                f"Error initializing AI services: {str(e)}", exc_info=True)
            self.model = None
            self.llm = None

    def _get_api_key(self):
        """Try multiple sources to get the API key"""
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key:
            return api_key

        try:
            from dotenv import load_dotenv
            load_dotenv()
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key:
                return api_key
        except Exception as e:
            self.logger.warning(f"Error loading from .env: {str(e)}")

        return None

    def _retry_api_call(self, func, max_retries=3, initial_delay=1):
        """Helper method to retry API calls with exponential backoff"""
        retries = 0
        while retries <= max_retries:
            try:
                return func()
            except Exception as e:
                retries += 1
                if retries > max_retries:
                    self.logger.error(
                        f"API call failed after {max_retries} retries: {str(e)}")
                    raise

                delay = initial_delay * (2 ** (retries - 1))
                self.logger.warning(
                    f"API call failed, retrying in {delay}s: {str(e)}")
                time.sleep(delay)

    def analyze_code(self, code_snippet, file_path=None):
        """Analyze a code snippet and generate documentation for it"""
        if not self.model:
            return "Error: AI service not available. Please check your GEMINI_API_KEY environment variable."

        self.logger.debug(f"Analyzing code for {file_path or 'unknown file'}")

        try:
            def api_call():
                prompt = f"""
                You are an expert software engineer tasked with creating comprehensive documentation.
                
                Generate comprehensive documentation for the following code snippet.
                Include:
                - A brief description of what this code does
                - Function/method/class descriptions
                - Parameter descriptions
                - Return value descriptions
                - Any important context or usage notes
                
                File path: {file_path or "Unknown"}
                
                Code:
                ```
                {code_snippet}
                ```
                """
                response = self.model.generate_content(prompt)
                return response

            response = self._retry_api_call(api_call)
            self.logger.debug(
                f"Successfully received response for {file_path or 'unknown file'}")

            return response.text
        except Exception as e:
            self.logger.error(f"Error analyzing code: {str(e)}", exc_info=True)
            return f"Error analyzing code: {str(e)}"

    def analyze_commit(self, commit_message, diff):
        """Analyze a commit and generate documentation for the changes"""
        if not self.model:
            return "Error: AI service not available. Please check your GEMINI_API_KEY environment variable."

        try:
            def api_call():
                prompt = f"""
                You are an expert software engineer that creates clear documentation for code changes.
                
                Generate documentation for the following commit:
                
                Commit message: {commit_message}
                
                Changes:
                ```
                {diff}
                ```
                """
                response = self.model.generate_content(prompt)
                return response
            response = self._retry_api_call(api_call)

            return response.text
        except Exception as e:
            self.logger.error(
                f"Error analyzing commit: {str(e)}", exc_info=True)
            return f"Error analyzing commit: {str(e)}"

    def generate_repository_summary(self, repo_data):
        """Generate a high-level summary of the repository"""
        if not self.model:
            return "Error: AI service not available. Please check your GEMINI_API_KEY environment variable."

        self.logger.debug(
            f"Generating summary for repository: {repo_data.get('name')}")

        try:
            # Define API call as a function for retry
            def api_call():
                prompt = f"""
                You are an expert software architect who can analyze repository structures.
                
                Generate a comprehensive summary of the following GitHub repository:
                
                Repository name: {repo_data.get("name", "")}
                Description: {repo_data.get("description", "")}
                Primary language: {repo_data.get("language", "")}
                Topics: {", ".join(repo_data.get("topics", []))}
                
                Repository structure:
                {repo_data.get("structure", "")}
                
                Summary (include purpose, main components, architecture, and key features):
                """
                response = self.model.generate_content(prompt)
                return response

            response = self._retry_api_call(api_call)
            self.logger.debug(
                f"Successfully received summary for repository: {repo_data.get('name')}")

            return response.text
        except Exception as e:
            self.logger.error(
                f"Error generating repository summary: {str(e)}", exc_info=True)
            return f"Error generating repository summary: {str(e)}"

    def answer_question(self, question, context):
        """Answer a question about the codebase using the provided context"""
        if not self.model:
            return "Error: AI service not available. Please check your GEMINI_API_KEY environment variable."

        try:
            # Define API call as a function for retry
            def api_call():
                prompt = f"""
                You are a helpful assistant that answers questions about codebases based on provided context.
                
                Based on the following context from the codebase, answer the question as accurately as possible.
                
                Context:
                {context}
                
                Question: {question}
                """
                response = self.model.generate_content(prompt)
                return response

            response = self._retry_api_call(api_call)

            return response.text
        except Exception as e:
            self.logger.error(
                f"Error answering question: {str(e)}", exc_info=True)
            return f"Error answering question: {str(e)}"

    def generate_mermaid_diagram(self, code_analysis):
        """Generate a Mermaid diagram based on code analysis"""
        if not self.model:
            return """```mermaid
    flowchart LR
        E[Error] -->|AI Service Not Available| M[Check API Key]
    ```"""

        try:
            prompt = f"""
            Generate a Mermaid flowchart diagram showing the system architecture. Follow these rules exactly:

            1. Start with 'flowchart LR'
            2. Use correct node styles:
            - [Component Name] for services
            - [(Database Name)] for databases
            - {{External Service}} for external services
            3. Connect nodes with arrows using -->
            4. Add labels between pipes: A -->|label text| B
            5. Group related components in subgraphs with proper indentation:
            subgraph Group Name
                A[Service] -->|action| B[Service]
            end

            Example of valid syntax:
            flowchart LR
                subgraph Backend
                    A[API] -->|process| B[(Database)]
                    B -->|fetch| C[Service]
                end
                subgraph Frontend
                    D[UI] -->|request| A
                end

            Code Analysis:
            {json.dumps(code_analysis, indent=2)}

            Generate only valid Mermaid flowchart syntax without any explanations or markdown delimiters.
            """
            
            def api_call():
                return self.model.generate_content(prompt)
                
            response = self._retry_api_call(api_call)
            diagram = response.text.strip()
            
            # Clean up the diagram
            if "```" in diagram:
                diagram = ''.join(
                    line for line in diagram.splitlines()
                    if not line.startswith("```") and not line.endswith("```")
                ).strip()
            
            # Ensure proper start
            if not diagram.startswith("flowchart"):
                diagram = "flowchart LR\n" + diagram
            
            # Format with proper indentation and newlines
            lines = diagram.splitlines()
            formatted_lines = []
            indent = "    "
            
            for line in lines:
                line = line.strip()
                if line.startswith("subgraph"):
                    formatted_lines.append(line)
                elif line == "end":
                    formatted_lines.append(line)
                else:
                    formatted_lines.append(indent + line)
            
            diagram = '\n'.join(formatted_lines)
            
            # Basic validation
            if not any(["-->" in diagram]):
                raise ValueError("Generated diagram does not contain valid connections")
            
            final_diagram = f"```mermaid\n{diagram}\n```"
            
            self.logger.debug(f"Generated Mermaid diagram:\n{final_diagram}")
            return final_diagram
                
        except Exception as e:
            self.logger.error(f"Error generating Mermaid diagram: {str(e)}")
            return """```mermaid
    flowchart LR
        E[Error] -->|Generation failed| M[Please try again]
    ```"""