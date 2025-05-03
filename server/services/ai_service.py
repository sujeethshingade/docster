import os
import time
import logging
import google.generativeai as genai
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI


class AIService:
    def __init__(self):
        logging.basicConfig(level=logging.DEBUG)
        self.logger = logging.getLogger(__name__)

        api_key = os.environ.get("GEMINI_API_KEY") or "your-gemini-api-key"
        self.logger.debug(
            f"Initializing AI service with API key: {'*' * (len(api_key) - 4) + api_key[-4:] if api_key else 'None'}")

        try:
            genai.configure(api_key=api_key)

            self.generation_config = {
                "temperature": 0.1,
                "top_p": 0.95,
                "top_k": 0,
                "max_output_tokens": 2048,
            }

            self.model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                generation_config=self.generation_config
            )
            self.logger.debug("Gemini client initialized successfully")

            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                google_api_key=api_key,
                temperature=0.1
            )
            self.logger.debug("LangChain LLM initialized successfully")
        except Exception as e:
            self.logger.error(
                f"Error initializing AI services: {str(e)}", exc_info=True)
            self.model = None
            self.llm = None

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
            self.logger.error("Gemini model not initialized properly")
            return "Error: AI service not available"

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
            self.logger.error("Gemini model not initialized properly")
            return "Error: AI service not available"

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
            self.logger.error("Gemini model not initialized properly")
            return "Error: AI service not available"

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
            self.logger.error("Gemini model not initialized properly")
            return "Error: AI service not available"

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
