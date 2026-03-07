import os

from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GOLANG_BACKEND_URL = os.getenv("GOLANG_BACKEND_URL", "http://localhost:3000")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "clair-ai-dev-key")
AGENT_MODEL = os.getenv("AGENT_MODEL", "gemini-2.5-flash-preview-native-audio-dialog")
PORT = int(os.getenv("PORT", "8001"))
