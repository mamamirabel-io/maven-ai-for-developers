import os
from crewai import LLM

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

GROQ_LLM = LLM(api_key=GROQ_API_KEY, model="groq/llama-3.3-70b-versatile")
DEEPSEEK_LLM = LLM(api_key=DEEPSEEK_API_KEY, model="deepseek/deepseek-chat")

# Use DeepSeek if available, otherwise Groq
DEFAULT_LLM = DEEPSEEK_LLM if DEEPSEEK_API_KEY else GROQ_LLM
