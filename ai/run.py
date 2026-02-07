import asyncio
import os
import warnings
import traceback
from functools import wraps
from typing import Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client

from crews.random_phrase_crew.crew import RandomPhraseCrew
from crews.random_phrase_crew.schemas import PhraseOutput
from crews.translation_crew.crew import TranslationCrew
from crews.translation_crew.schemas import TranslationOutput

from lib.tracer import traceable

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

# Initialize Flask app
app = Flask(__name__)

# Configure CORS - allow requests from localhost frontend
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:5173",  # Vite dev server
            "http://localhost:3000",  # Alternative port
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def require_auth(f):
    """
    Decorator to require authentication for endpoints.
    Validates the JWT token from the Authorization header.
    """
    @wraps(f)
    async def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Authorization header is required"}), 401

        # Extract token from "Bearer <token>" format
        try:
            token = auth_header.split(" ")[1] if " " in auth_header else auth_header
        except IndexError:
            return jsonify({"error": "Invalid authorization header format"}), 401

        try:
            # Verify the JWT token with Supabase
            user_response = supabase.auth.get_user(token)
            request.user = user_response.user
        except Exception as e:
            return jsonify({"error": f"Authentication failed: {str(e)}"}), 401

        return await f(*args, **kwargs)

    return decorated_function


async def get_user_context(user_id: str, user_token: str) -> Optional[str]:
    """Fetch user context from Supabase."""
    try:
        user_supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        user_supabase.postgrest.auth(user_token)
        
        response = user_supabase.table("profiles").select("context").eq("id", user_id).execute()

        if response.data and len(response.data) > 0:
            return response.data[0].get("context", "")
        return None
    except Exception as e:
        print(f"Error fetching user context: {e}")
        return None


async def get_user_profile(user_id: str, user_token: str) -> Optional[dict]:
    """Fetch user profile including language preferences from Supabase."""
    try:
        user_supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        user_supabase.postgrest.auth(user_token)
        
        response = user_supabase.table("profiles").select("*").eq("id", user_id).execute()

        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        return None


@traceable
async def generate_random_phrase(words: list[str], user_context: str) -> PhraseOutput:
    """
    Generate a random phrase using the RandomPhraseCrew.

    Args:
        words: List of words to use in the phrase
        user_context: User context to personalize the phrase

    Returns:
        PhraseOutput with phrase and words used
    """
    inputs = {
        'words': jsonify(words).get_data(as_text=True),
        'user_context': jsonify(user_context).get_data(as_text=True)
    }

    result = await RandomPhraseCrew().crew().kickoff_async(inputs=inputs)

    # CrewAI returns a result with a .pydantic attribute containing the Pydantic model
    if hasattr(result, 'pydantic'):
        return result.pydantic

    # Fallback - return a basic PhraseOutput
    return PhraseOutput(phrase=str(result), words=words)


@traceable
async def translate_word(
    word: str, 
    source_language: str, 
    target_language: str, 
    user_context: str
) -> TranslationOutput:
    """
    Translate a word with context and examples using the TranslationCrew.

    Args:
        word: The word to translate
        source_language: Source language
        target_language: Target language
        user_context: User context to personalize the translation

    Returns:
        TranslationOutput with translations, examples, and notes
    """
    inputs = {
        'word': word,
        'source_language': source_language,
        'target_language': target_language,
        'user_context': user_context or ""
    }

    result = await TranslationCrew().crew().kickoff_async(inputs=inputs)

    # CrewAI returns a result with a .pydantic attribute containing the Pydantic model
    if hasattr(result, 'pydantic'):
        return result.pydantic

    # Fallback - return a basic TranslationOutput
    return TranslationOutput(
        word=word,
        source_language=source_language,
        target_language=target_language,
        primary_translation=str(result),
        alternative_translations=[],
        examples=[],
        notes=""
    )


@app.route("/health", methods=["GET"])
async def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}), 200


@app.route("/api/random-phrase", methods=["POST"])
@require_auth
async def get_random_phrase():
    """
    Generate a random phrase based on provided words and user context.

    Request body:
        {
            "words": ["word1", "word2", ...]
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "phrase": "generated phrase",
            "words_used": ["word1", "word2"]
        }
    """
    try:
        # Get words from request body
        data = request.get_json()

        if not data or "words" not in data:
            return jsonify({"error": "Request body must include 'words' array"}), 400

        words = data.get("words", [])

        if not isinstance(words, list) or len(words) == 0:
            return jsonify({"error": "'words' must be a non-empty array"}), 400

        # Get user context from Supabase
        user_id = request.user.id
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1] if " " in auth_header else auth_header
        user_context = await get_user_context(user_id, token)

        # Generate the phrase
        result = await generate_random_phrase(words, user_context or "")

        return jsonify(result.model_dump()), 200

    except Exception as e:
        print(f"\n=== ERROR in /api/random-phrase ===")
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        print("=== END ERROR ===")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/translate", methods=["POST"])
@require_auth
async def translate():
    """
    Translate a word with context and examples.

    Request body:
        {
            "word": "hello",
            "source_language": "English",
            "target_language": "Spanish"
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "word": "hello",
            "source_language": "English",
            "target_language": "Spanish",
            "primary_translation": "hola",
            "alternative_translations": ["buenos días", "qué tal"],
            "examples": [
                {
                    "sentence": "Hola, ¿cómo estás?",
                    "translation": "Hello, how are you?"
                }
            ],
            "notes": "Used as a casual greeting."
        }
    """
    try:
        # Get data from request body
        data = request.get_json()

        if not data or "word" not in data:
            return jsonify({"error": "Request body must include 'word'"}), 400

        word = data.get("word")
        source_language = data.get("source_language")
        target_language = data.get("target_language")

        if not word:
            return jsonify({"error": "'word' cannot be empty"}), 400

        # Get user profile from Supabase
        user_id = request.user.id
        auth_header = request.headers.get("Authorization")
        token = auth_header.split(" ")[1] if " " in auth_header else auth_header
        user_profile = await get_user_profile(user_id, token)

        # Use profile language preferences if not provided in request
        if not source_language and user_profile:
            source_language = user_profile.get("native_language", "English")
        if not target_language and user_profile:
            target_language = user_profile.get("target_language", "Spanish")
        
        # Default fallback values
        source_language = source_language or "English"
        target_language = target_language or "Spanish"

        user_context = user_profile.get("context", "") if user_profile else ""

        # Generate translation with context
        result = await translate_word(
            word=word,
            source_language=source_language,
            target_language=target_language,
            user_context=user_context or ""
        )

        return jsonify(result.model_dump()), 200

    except Exception as e:
        print(f"\n=== ERROR in /api/translate ===")
        print(f"Error: {str(e)}")
        print(traceback.format_exc())
        print("=== END ERROR ===")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


if __name__ == "__main__":
    # Run the Flask app
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
