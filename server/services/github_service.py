import os
import logging
import requests
from github import Github


class GitHubService:
    def __init__(self, access_token=None):
        logging.basicConfig(level=logging.DEBUG)
        self.logger = logging.getLogger(__name__)

        self._access_token = None
        self.github = None

        if access_token:
            self.access_token = access_token

    @property
    def access_token(self):
        return self._access_token

    @access_token.setter
    def access_token(self, token):
        """Set the access token and initialize GitHub client"""
        self._access_token = token

        if token:
            try:
                self.github = Github(token)
                self.logger.debug(
                    "GitHub client initialized with access token")
                # Validate the token by making a simple request
                self.github.get_user().login
                self.logger.debug("GitHub token validated successfully")
            except Exception as e:
                self.logger.error(
                    f"Failed to initialize GitHub client: {str(e)}")
                self.github = None
        else:
            self.github = None

    def authenticate(self, code):
        """Exchange code for access token during OAuth flow"""
        client_id = os.environ.get('GITHUB_CLIENT_ID')
        client_secret = os.environ.get('GITHUB_CLIENT_SECRET')

        self.logger.debug(
            f"Authenticating with GitHub OAuth, code length: {len(code)}")

        if not client_id or not client_secret:
            self.logger.error("Missing GitHub OAuth credentials")
            return None

        try:
            response = requests.post(
                'https://github.com/login/oauth/access_token',
                data={
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'code': code
                },
                headers={'Accept': 'application/json'}
            )

            self.logger.debug(
                f"GitHub OAuth response status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if 'error' in data:
                    self.logger.error(
                        f"GitHub OAuth error: {data['error_description']}")
                    return None

                token = data.get('access_token')
                if not token:
                    self.logger.error("No access token in GitHub response")
                    return None

                self.logger.debug("Successfully obtained GitHub access token")
                self.access_token = token
                return self.access_token
            else:
                self.logger.error(
                    f"GitHub OAuth request failed: {response.text}")
                return None
        except Exception as e:
            self.logger.error(
                f"Exception during GitHub authentication: {str(e)}", exc_info=True)
            return None

    def get_repository(self, repo_name):
        """Get repository data"""
        if not self.github:
            error_msg = "GitHub client not authenticated"
            self.logger.error(error_msg)
            raise Exception(error_msg)

        try:
            repo = self.github.get_repo(repo_name)
            self.logger.debug(
                f"Successfully retrieved repository: {repo_name}")
            return repo
        except Exception as e:
            self.logger.error(
                f"Error retrieving repository {repo_name}: {str(e)}", exc_info=True)
            raise

    def get_repository_contents(self, repo_name, path=""):
        """Get contents of repository at specific path"""
        try:
            repo = self.get_repository(repo_name)
            contents = repo.get_contents(path)
            self.logger.debug(f"Retrieved contents of {repo_name}/{path}")
            return contents
        except Exception as e:
            self.logger.error(
                f"Error getting repository contents {repo_name}/{path}: {str(e)}", exc_info=True)
            raise

    def get_commits(self, repo_name, max_count=100):
        """Get recent commits from repository"""
        repo = self.get_repository(repo_name)
        return list(repo.get_commits()[:max_count])

    def get_pull_requests(self, repo_name, state="all", max_count=100):
        """Get pull requests from repository"""
        repo = self.get_repository(repo_name)
        return list(repo.get_pulls(state=state)[:max_count])

    def get_issues(self, repo_name, state="all", max_count=100):
        """Get issues from repository"""
        repo = self.get_repository(repo_name)
        return list(repo.get_issues(state=state)[:max_count])
