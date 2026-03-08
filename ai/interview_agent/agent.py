import os

from google.adk.agents import Agent
from google.adk.models.google_llm import Gemini
from google.genai import types

from interview_agent.prompts import CLAIR_SYSTEM_PROMPT
from interview_agent.tools import (
    send_coding_challenge_tool,
    observe_screen_tool,
    end_interview_tool,
    get_cheating_signals_tool,
)

MODEL = os.getenv("AGENT_MODEL", "gemini-2.5-flash-preview-native-audio-dialog")


def create_interview_agent(interview_config: dict | None = None) -> Agent:
    if interview_config is None:
        interview_config = {}

    custom_llm = Gemini(
        model=MODEL,
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Orus"
                )
            ),
            language_code="en-US",
        ),
    )

    job_desc = interview_config.get("job_description", "")
    context_section = f"""
## Interview Configuration
- Candidate: {interview_config.get('candidate_name', 'the candidate')}
- Position: {interview_config.get('position', 'Software Engineer')}
- Level: {interview_config.get('level', 'junior')}
- Job Requirements (Tech Stack): {', '.join(interview_config.get('tech_stack', [])) or 'General'}
{'- Job Description: ' + job_desc if job_desc else ''}

Note: You DO NOT have the candidate's resume. Do not claim to have read their resume. Use the Job Requirements to guide your questions about their experience.
"""

    return Agent(
        name="clair_interviewer",
        model=custom_llm,
        instruction=CLAIR_SYSTEM_PROMPT + context_section,
        description="Clair - Senior Software Engineer conducting a technical interview.",
        tools=[
            send_coding_challenge_tool,
            observe_screen_tool,
            end_interview_tool,
            get_cheating_signals_tool,
        ],
    )
