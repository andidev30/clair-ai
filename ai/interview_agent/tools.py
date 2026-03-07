import json
import logging

from google.adk.tools import FunctionTool
from google.genai import types

logger = logging.getLogger(__name__)

# Per-session state keyed by session token to support concurrent sessions
_session_states: dict[str, dict] = {}


def set_session_state(token: str, state: dict):
    _session_states[token] = state


def get_session_state_by_token(token: str) -> dict:
    return _session_states.get(token, {})


def remove_session_state(token: str):
    _session_states.pop(token, None)


# Active token for the current tool execution context
_active_token: str = ""


def set_active_token(token: str):
    global _active_token
    _active_token = token


def get_session_state() -> dict:
    """Get state for the currently active session."""
    return _session_states.get(_active_token, {})


def change_stage(stage: str, action: str = "") -> dict:
    """Signal the UI to transition to a new interview stage.

    Call this tool when you want the UI to change. For example, call with
    stage='coding' and action='show_editor' to show the code editor, or
    stage='wrapup' and action='hide_editor' to hide it.

    Args:
        stage: The stage to transition to. One of 'warmup', 'coding', 'wrapup'.
        action: Optional UI action to trigger. One of:
            - 'show_editor': Show the code editor panel
            - 'hide_editor': Hide the code editor panel
            - 'request_screen_share': Prompt user to share their screen

    Returns:
        Confirmation that the stage change was sent to the UI.
    """
    ws = get_session_state().get("websocket")
    if ws:
        import asyncio
        msg = json.dumps({
            "type": "stage_change",
            "stage": stage,
            "action": action,
        })
        asyncio.create_task(ws.send_text(msg))
    return {"status": "stage_changed", "stage": stage, "action": action}


def send_coding_challenge(problem: str, language: str = "javascript", starter_code: str = "") -> dict:
    """Send a coding challenge to the candidate's editor.

    Args:
        problem: The coding problem description to display to the candidate.
        language: The programming language for the challenge (e.g. javascript, python, go).
        starter_code: Optional starter code template.

    Returns:
        A confirmation that the challenge was sent.
    """
    ws = get_session_state().get("websocket")
    if ws:
        import asyncio
        msg = json.dumps({
            "type": "coding_challenge",
            "problem": problem,
            "language": language,
            "starter_code": starter_code,
        })
        asyncio.create_task(ws.send_text(msg))
    return {"status": "sent", "problem": problem, "language": language}


def observe_screen() -> dict:
    """Get a description of what's currently visible on the candidate's screen.

    Returns:
        The latest screen observation or a message if no screen is shared.
    """
    observation = get_session_state().get("latest_screen_observation", "")
    if observation:
        return {"screen_content": observation}
    return {"screen_content": "No screen is currently being shared by the candidate."}


def end_interview(
    overall_score: float,
    recommendation: str,
    summary: str,
    communication: float,
    technical_knowledge: float,
    problem_solving: float,
    coding_skills: float,
    system_design: float,
) -> dict:
    """Signal that the interview is complete and submit the final evaluation scores.

    Args:
        overall_score: The overall interview score from 0 to 100.
        recommendation: One of 'strong_hire', 'hire', 'no_hire', 'strong_no_hire'.
        summary: A brief summary of the candidate's performance.
        communication: Communication score from 0 to 100.
        technical_knowledge: Technical knowledge score from 0 to 100.
        problem_solving: Problem solving score from 0 to 100.
        coding_skills: Coding skills score from 0 to 100.
        system_design: System design score from 0 to 100.

    Returns:
        Confirmation that the interview ending process has started.
    """
    state = get_session_state()
    state["interview_ended"] = True
    state["scores"] = {
        "overall_score": overall_score,
        "recommendation": recommendation,
        "summary": summary,
        "score_breakdown": {
            "communication": communication,
            "technical_knowledge": technical_knowledge,
            "problem_solving": problem_solving,
            "coding_skills": coding_skills,
            "system_design": system_design,
        },
    }
    return {"status": "interview_ended", "message": "Interview evaluation submitted."}


change_stage_tool = FunctionTool(change_stage)
send_coding_challenge_tool = FunctionTool(send_coding_challenge)
observe_screen_tool = FunctionTool(observe_screen)
end_interview_tool = FunctionTool(end_interview)
