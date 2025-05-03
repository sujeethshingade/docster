from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from routes.github_routes import github_bp
from routes.documentation_routes import documentation_bp
from routes.chat_routes import chat_bp

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key')

CORS(app, origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')])

app.register_blueprint(github_bp)
app.register_blueprint(documentation_bp)
app.register_blueprint(chat_bp)


@app.route('/')
def index():
    return jsonify({"status": "success", "message": "Docster API is running"})


# Create directories for storage
os.makedirs(os.path.join(os.path.dirname(
    __file__), 'data', 'docs'), exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(
    __file__), 'data', 'chats'), exist_ok=True)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
