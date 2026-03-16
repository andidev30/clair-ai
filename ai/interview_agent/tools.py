import contextvars
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


# Active token scoped to each async task — eliminates race conditions under
# concurrent sessions. asyncio.gather() copies the current context into each
# task, so set_active_token() called before gather() is visible to all child
# tasks for that session and only that session.
_active_token_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "active_token", default=""
)


def set_active_token(token: str):
    _active_token_var.set(token)


def get_session_state() -> dict:
    """Get state for the currently active session."""
    return _session_states.get(_active_token_var.get(), {})


def _send_to_client(msg_dict: dict):
    """Helper to send a JSON message to the client websocket."""
    ws = get_session_state().get("websocket")
    if ws:
        import asyncio
        asyncio.create_task(ws.send_text(json.dumps(msg_dict)))


def send_coding_challenge(problem: str, language: str = "javascript", starter_code: str = "") -> dict:
    """Send a coding challenge to the candidate's editor.

    This will automatically show the code editor and prompt the candidate
    to share their screen.

    Args:
        problem: The coding problem description to display to the candidate.
        language: The programming language for the challenge (e.g. javascript, python, go).
        starter_code: Starter code template with the function signature and a comment
            indicating where to write the solution. Always provide this — never leave it empty.

    Returns:
        A confirmation that the challenge was sent.
    """
    state = get_session_state()
    state["current_stage"] = "coding"

    # Store challenge for delivery after candidate shares their screen
    state["pending_challenge"] = {
        "problem": problem,
        "language": language,
        "starter_code": starter_code,
    }

    # Phase 1: Only request screen share — editor + problem delivered after confirmation
    _send_to_client({
        "type": "stage_change",
        "stage": "coding",
        "action": "request_screen_share",
    })
    return {
        "status": "screen_share_requested",
        "message": "Screen share requested. Ask the candidate to share their screen, then STOP speaking. Do NOT describe or mention anything about the problem yet. Wait silently — you will receive a system notification when the screen is shared and the problem is visible.",
    }


def observe_screen() -> dict:
    """Get a description of what's currently visible on the candidate's screen.

    Returns:
        The latest screen observation or a message if no screen is shared.
    """
    observation = get_session_state().get("latest_screen_observation", "")
    if observation:
        return {"screen_content": observation}
    return {"screen_content": "No screen is currently being shared by the candidate."}


def observe_camera() -> dict:
    """Get a description of what's currently visible on the candidate's camera.

    Use this to check for suspicious behavior like looking away from screen,
    another person being present, or reading from notes/second screen.

    Returns:
        The latest camera observation or a message if camera is not active.
    """
    state = get_session_state()
    if not state.get("camera_active"):
        return {"camera_content": "Camera is not active. The candidate has not enabled their camera."}
    observation = state.get("latest_camera_observation", "")
    if observation:
        return {"camera_content": observation}
    return {"camera_content": "Camera is active but no observation available yet."}


def end_interview(
    overall_score: float,
    recommendation: str,
    summary: str,
    communication: float,
    technical_knowledge: float,
    problem_solving: float,
    coding_skills: float,
) -> dict:
    """Signal that the interview is complete and submit the final evaluation scores.

    This will automatically hide the code editor and transition to the wrap-up stage.

    Args:
        overall_score: The overall interview score from 0 to 100.
        recommendation: One of 'strong_hire', 'hire', 'no_hire', 'strong_no_hire'.
        summary: A brief summary of the candidate's performance.
        communication: Communication score from 0 to 100.
        technical_knowledge: Technical knowledge score from 0 to 100.
        problem_solving: Problem solving score from 0 to 100.
        coding_skills: Coding skills score from 0 to 100.

    Returns:
        Confirmation that the interview ending process has started.
    """
    state = get_session_state()
    state["current_stage"] = "wrapup"
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
        },
    }

    # Automatically hide editor on wrap-up
    _send_to_client({
        "type": "stage_change",
        "stage": "wrapup",
        "action": "hide_editor",
    })

    return {"status": "interview_ended", "message": "Interview evaluation submitted."}


def get_cheating_signals() -> dict:
    """Get all cheating signals detected during the interview.

    Returns suspicious behaviors: AI tool usage on screen, large code pastes,
    tab switches. Call this before end_interview to factor integrity signals
    into your evaluation.

    Returns:
        A dict with 'signals' list and 'summary' string.
    """
    state = get_session_state()
    signals = state.get("cheating_signals", [])
    if not signals:
        return {"signals": [], "summary": "No suspicious behavior detected."}
    lines = [f"- [{s['signal_type']}] {s['detail']}" for s in signals]
    return {
        "signals": signals,
        "summary": f"{len(signals)} suspicious event(s) detected:\n" + "\n".join(lines),
    }


send_coding_challenge_tool = FunctionTool(send_coding_challenge)
observe_screen_tool = FunctionTool(observe_screen)
observe_camera_tool = FunctionTool(observe_camera)
end_interview_tool = FunctionTool(end_interview)
get_cheating_signals_tool = FunctionTool(get_cheating_signals)
