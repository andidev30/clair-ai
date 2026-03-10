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
        starter_code: Optional starter code template.

    Returns:
        A confirmation that the challenge was sent.
    """
    state = get_session_state()
    state["current_stage"] = "coding"

    # Automatically handle UI transitions
    _send_to_client({
        "type": "stage_change",
        "stage": "coding",
        "action": "request_screen_share",
    })
    _send_to_client({
        "type": "stage_change",
        "stage": "coding",
        "action": "show_editor",
    })
    _send_to_client({
        "type": "coding_challenge",
        "problem": problem,
        "language": language,
        "starter_code": starter_code,
    })
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
    system_design: float,
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
        system_design: System design score from 0 to 100.

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
            "system_design": system_design,
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
