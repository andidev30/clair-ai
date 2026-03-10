import asyncio
import base64
import json
import logging
import re

import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

import config
from interview_agent import create_interview_agent
from interview_agent.tools import (
    set_session_state, get_session_state_by_token,
    set_active_token, remove_session_state,
)
from services.webhook import post_result

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Markers that indicate leaked internal reasoning / chain-of-thought
_REASONING_MARKERS = [
    "**",               # Markdown bold (e.g. "**Send Coding Challenge**:")
    "Call tool",        # Tool-call planning
    "`send_coding_challenge`",
    "`end_interview`",
    "`get_cheating_signals`",
    "I must not output",
    "I will execute",
    "Wait for tool execution",
    "conversational transition",
    "proceed with",
    "SILENTLY",
]


def clean_transcription(text: str) -> str:
    """Strip leaked internal reasoning from model output transcription.

    The native audio model sometimes leaks chain-of-thought alongside
    actual speech. This removes reasoning blocks and keeps only the
    natural conversational text.
    """
    if not text:
        return text

    # Quick check — if no reasoning markers, return as-is
    if not any(m in text for m in _REASONING_MARKERS):
        return text

    logger.info(f"Cleaning leaked reasoning from transcription ({len(text)} chars)")

    # Reasoning typically appears as numbered steps with markdown bold headers
    # e.g. "1. **Send Coding Challenge**: Call tool ..."
    # Try to split: [conversational text] [reasoning block] [conversational text]
    reasoning_start = re.search(r'\d+\.\s*\*\*', text)
    if reasoning_start:
        before = text[:reasoning_start.start()].strip()

        # Find where reasoning ends — look for meta-text endings
        after = ""
        meta_endings = [
            "in the next turn.",
            "Wait for tool execution.",
            "conversational transition.",
            "provide the conversational transition",
        ]
        for ending in meta_endings:
            idx = text.rfind(ending)
            if idx >= 0:
                after = text[idx + len(ending):].strip()
                break

        parts = [p for p in [before, after] if p]
        if parts:
            cleaned = " ".join(parts)
            logger.info(f"Cleaned transcription: \"{cleaned[:80]}...\"")
            return cleaned

    # Fallback: remove lines that contain reasoning markers
    lines = text.split(".")
    clean_lines = []
    for line in lines:
        if not any(m in line for m in _REASONING_MARKERS):
            clean_lines.append(line)
    cleaned = ".".join(clean_lines).strip()

    if cleaned and len(cleaned) > 10:
        logger.info(f"Fallback-cleaned transcription: \"{cleaned[:80]}...\"")
        return cleaned

    # If everything was stripped, return empty to suppress the message
    logger.info("Entire transcription was reasoning — suppressing")
    return ""

app = FastAPI(title="Clair AI - Interview Service")

APP_NAME = "clair-ai"
session_service = InMemorySessionService()

# Cache of runners per interview config (keyed by session token)
_runners: dict[str, Runner] = {}


async def fetch_session_config(session_token: str) -> dict | None:
    url = f"{config.GOLANG_BACKEND_URL}/api/sessions/{session_token}/join"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
            logger.error(f"Failed to fetch session: {resp.status_code}")
            return None
    except Exception as e:
        logger.error(f"Error fetching session config: {e}")
        return None


def get_or_create_runner(session_token: str, interview_config: dict) -> Runner:
    if session_token not in _runners:
        agent = create_interview_agent(interview_config)
        _runners[session_token] = Runner(
            app_name=APP_NAME,
            agent=agent,
            session_service=session_service,
        )
    return _runners[session_token]


@app.get("/health")
async def health():
    return {"status": "ok", "service": "clair-ai"}


@app.websocket("/ws/interview/{session_token}")
async def interview_ws(websocket: WebSocket, session_token: str):
    await websocket.accept()
    logger.info(f"WebSocket connected: {session_token}")

    # Fetch session config from Golang backend
    session_data = await fetch_session_config(session_token)
    if not session_data:
        await websocket.send_text(json.dumps({"type": "error", "message": "Invalid session"}))
        await websocket.close()
        return

    interview_config = session_data.get("interview", {})
    # candidate_name is now stored on the session, not the interview
    interview_config["candidate_name"] = session_data.get("candidate_name", interview_config.get("candidate_name", "the candidate"))
    session_id = session_data.get("id", session_token)

    # Set up per-session state for tools (keyed by token)
    set_session_state(session_token, {
        "websocket": websocket,
        "session_id": session_id,
        "interview_config": interview_config,
        "latest_screen_observation": "",
        "latest_camera_observation": "",
        "camera_active": False,
        "current_stage": "greeting",
        "interview_ended": False,
        "transcript": [],
    })
    set_active_token(session_token)

    # Create runner and ADK session
    runner = get_or_create_runner(session_token, interview_config)
    user_id = f"candidate_{session_token}"
    adk_session_id = f"session_{session_token}"

    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=adk_session_id
    )
    if not session:
        await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=adk_session_id
        )

    live_request_queue = LiveRequestQueue()

    # Gate to pause ALL realtime input (audio + screen frames) during
    # sensitive operations. Native audio models reject sendRealtimeInput
    # during tool calls and agent transitions, causing 1008 errors.
    audio_gate = asyncio.Event()
    # Start CLOSED — only open after model produces first audio output,
    # proving the connection is ready to accept realtime input.
    audio_gate.clear()

    run_config = RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
        context_window_compression=types.ContextWindowCompressionConfig(
            trigger_tokens=100000,
            sliding_window=types.SlidingWindow(target_tokens=80000),
        ),
    )

    # Send ready signal to client
    await websocket.send_text(json.dumps({
        "type": "session_ready",
        "session_id": session_id,
        "interview": interview_config,
    }))

    async def upstream_task():
        """Receive from WebSocket, send to LiveRequestQueue."""
        try:
            # Wait for candidate_ready before triggering greeting.
            # Read from websocket so we don't deadlock.
            logger.info("Waiting for candidate_ready signal...")
            greeting_sent = False

            while True:
                message = await websocket.receive()

                if "bytes" in message:
                    if not audio_gate.is_set():
                        continue
                    audio_blob = types.Blob(
                        mime_type="audio/pcm;rate=16000",
                        data=message["bytes"],
                    )
                    live_request_queue.send_realtime(audio_blob)

                elif "text" in message:
                    text_data = message["text"]
                    try:
                        msg = json.loads(text_data)
                        msg_type = msg.get("type", "")

                        if msg_type == "candidate_ready" and not greeting_sent:
                            greeting_sent = True
                            logger.info("Candidate ready, triggering greeting")
                            await asyncio.sleep(1)
                            live_request_queue.send_content(types.Content(
                                parts=[types.Part(text="The candidate just hopped on. Say hi and get the conversation going naturally — keep it casual.")]
                            ))
                            continue

                        elif msg_type == "text":
                            # Text message from candidate
                            content = types.Content(
                                parts=[types.Part(text=msg["text"])]
                            )
                            live_request_queue.send_content(content)

                        elif msg_type == "screen_frame":
                            # Screen capture frame — also gated to prevent 1008
                            if not audio_gate.is_set():
                                continue
                            image_data = base64.b64decode(msg["data"])
                            image_blob = types.Blob(
                                mime_type=msg.get("mimeType", "image/jpeg"),
                                data=image_data,
                            )
                            live_request_queue.send_realtime(image_blob)
                            # Store for observe_screen tool
                            state = get_session_state_by_token(session_token)
                            state["latest_screen_observation"] = (
                                "Screen frame received - candidate's code editor is visible"
                            )

                        elif msg_type == "camera_frame":
                            # Camera capture frame — also gated to prevent 1008
                            if not audio_gate.is_set():
                                continue
                            image_data = base64.b64decode(msg["data"])
                            image_blob = types.Blob(
                                mime_type=msg.get("mimeType", "image/jpeg"),
                                data=image_data,
                            )
                            live_request_queue.send_realtime(image_blob)
                            # Store for observe_camera tool
                            state = get_session_state_by_token(session_token)
                            state["latest_camera_observation"] = (
                                "Camera frame received - candidate visible"
                            )
                            state["camera_active"] = True

                        elif msg_type == "cheating_signal":
                            # Behavioral cheating signal from frontend — store silently, do NOT inject into live queue
                            state = get_session_state_by_token(session_token)
                            state.setdefault("cheating_signals", []).append({
                                "signal_type": msg.get("signal_type"),
                                "detail": msg.get("detail", ""),
                                "timestamp": msg.get("timestamp", 0),
                            })
                            logger.info(f"Cheating signal: {msg.get('signal_type')} - {msg.get('detail', '')[:60]}")

                        elif msg_type == "screen_shared":
                            # Phase 2: Candidate shared screen — deliver pending challenge
                            state = get_session_state_by_token(session_token)
                            pending = state.pop("pending_challenge", None)
                            if pending:
                                await websocket.send_text(json.dumps({
                                    "type": "stage_change",
                                    "stage": "coding",
                                    "action": "show_editor",
                                }))
                                await websocket.send_text(json.dumps({
                                    "type": "coding_challenge",
                                    "problem": pending["problem"],
                                    "language": pending["language"],
                                    "starter_code": pending.get("starter_code", ""),
                                }))
                                live_request_queue.send_content(types.Content(
                                    parts=[types.Part(text=(
                                        "The candidate just shared their screen and the coding problem "
                                        "is now displayed in their editor. Walk them through the problem "
                                        "conversationally — describe what it's asking in your own words, "
                                        "clarify expected inputs and outputs, mention any important constraints, "
                                        "and ask if they have any questions before they start coding."
                                    ))]
                                ))
                            continue

                        elif msg_type == "end_interview":
                            # Candidate manually ended — handle server-side, no LLM roundtrip
                            logger.info("Candidate clicked End — closing session directly")
                            state = get_session_state_by_token(session_token)
                            state["interview_ended"] = True
                            state["_end_result_posted"] = True
                            state["_end_timestamp"] = asyncio.get_event_loop().time()

                            transcript = state.get("transcript", [])
                            cheating_signals = state.get("cheating_signals", [])
                            key_moments = [
                                {
                                    "timestamp": float(s.get("timestamp", 0)) / 1000,
                                    "type": s["signal_type"],
                                    "description": s["detail"],
                                }
                                for s in cheating_signals
                            ]
                            result_data = {
                                "overall_score": 0,
                                "recommendation": "no_hire",
                                "summary": "Interview ended early by candidate.",
                                "transcript": [
                                    {"speaker": t["speaker"], "text": t["text"], "timestamp": float(i)}
                                    for i, t in enumerate(transcript)
                                ],
                                "score_breakdown": {
                                    "communication": 0,
                                    "technical_knowledge": 0,
                                    "problem_solving": 0,
                                    "coding_skills": 0,
                                    "system_design": 0,
                                },
                                "key_moments": key_moments,
                            }
                            await post_result(session_id, result_data)

                            await websocket.send_text(json.dumps({
                                "type": "interview_complete",
                                "message": "Interview has been completed.",
                            }))
                            live_request_queue.close()
                            return

                    except json.JSONDecodeError:
                        # Plain text message
                        content = types.Content(
                            parts=[types.Part(text=text_data)]
                        )
                        live_request_queue.send_content(content)

        except WebSocketDisconnect:
            logger.info(f"Client disconnected: {session_token}")
        except Exception as e:
            logger.error(f"Upstream error: {e}")

    async def downstream_task():
        """Receive events from run_live(), send to WebSocket."""
        gate_timeout_task: asyncio.Task | None = None
        model_speaking = False
        last_event_time = asyncio.get_event_loop().time()

        async def _gate_with_timeout(seconds: float):
            """Safety timeout to re-open audio gate if no signal arrives."""
            await asyncio.sleep(seconds)
            if not audio_gate.is_set():
                audio_gate.set()
                logger.info("Audio gate re-opened by safety timeout")

        def _open_gate():
            nonlocal gate_timeout_task
            if gate_timeout_task and not gate_timeout_task.done():
                gate_timeout_task.cancel()
            audio_gate.set()
            logger.debug(f"Gate OPENED (was_speaking={model_speaking})")

        def _close_gate(timeout: float = 5.0):
            nonlocal gate_timeout_task
            audio_gate.clear()
            logger.debug(f"Gate CLOSED (timeout={timeout}s)")

            # Drain the queue to drop any pending in-flight audio frames.
            # If we don't drop them, the runner will send them while the API
            # is trying to handle a tool call, which causes a 1008 policy violation.
            while not live_request_queue._queue.empty():
                try:
                    live_request_queue._queue.get_nowait()
                except asyncio.QueueEmpty:
                    break

            if gate_timeout_task and not gate_timeout_task.done():
                gate_timeout_task.cancel()
            gate_timeout_task = asyncio.create_task(_gate_with_timeout(timeout))

        max_retries = 3
        for attempt in range(max_retries + 1):
            try:
                async for event in runner.run_live(
                    user_id=user_id,
                    session_id=adk_session_id,
                    live_request_queue=live_request_queue,
                    run_config=run_config,
                ):
                    last_event_time = asyncio.get_event_loop().time()

                    if event.content and event.content.parts:
                        has_function_call = any(
                            p.function_call for p in event.content.parts
                        )
                        has_function_response = any(
                            p.function_response for p in event.content.parts
                        )
                        has_audio = any(
                            p.inline_data and p.inline_data.data
                            for p in event.content.parts
                        )

                        # Gate audio during tool calls
                        if has_function_call:
                            logger.info("Function call detected, pausing realtime input")
                            _close_gate(5.0)

                        if has_function_response:
                            logger.info("Function response, resuming realtime input")
                            _open_gate()

                        # When model produces audio output, track speaking state.
                        # Open gate when model STOPS speaking (it's ready for input).
                        if has_audio:
                            if not model_speaking:
                                model_speaking = True
                                logger.info("Model started speaking, gate stays closed during speech")
                        else:
                            if model_speaking and not has_function_call:
                                model_speaking = False
                                logger.info("Model stopped speaking, opening gate for input")
                                _open_gate()

                    # Extract audio and send explicitly
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if part.inline_data and part.inline_data.data:
                                audio_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                                await websocket.send_text(json.dumps({
                                    "type": "agent.audio",
                                    "data": audio_b64,
                                }))

                    # Clean leaked reasoning from output transcription
                    # before forwarding to client or storing in transcript.
                    if event.output_transcription and event.output_transcription.text:
                        cleaned = clean_transcription(event.output_transcription.text)
                        if cleaned != event.output_transcription.text:
                            event.output_transcription.text = cleaned

                    # Forward event as JSON to the client (skip if transcription was emptied)
                    if not (event.output_transcription and event.output_transcription.text == ""):
                        event_json = event.model_dump_json(exclude_none=True, by_alias=True)
                        await websocket.send_text(event_json)

                    # Track transcription
                    state = get_session_state_by_token(session_token)

                    if event.input_transcription and event.input_transcription.text:
                        finished = getattr(event.input_transcription, "finished", False)
                        logger.info(
                            f"[TRANSCRIPT IN] candidate {'FINAL' if finished else 'partial'}: "
                            f"\"{event.input_transcription.text[:80]}...\""
                        )
                        if finished:
                            state.setdefault("transcript", []).append({
                                "speaker": "candidate",
                                "text": event.input_transcription.text,
                            })

                    if event.output_transcription and event.output_transcription.text:
                        finished = getattr(event.output_transcription, "finished", False)
                        logger.info(
                            f"[TRANSCRIPT OUT] clair {'FINAL' if finished else 'partial'}: "
                            f"\"{event.output_transcription.text[:80]}...\""
                        )
                        if finished:
                            state.setdefault("transcript", []).append({
                                "speaker": "clair",
                                "text": event.output_transcription.text,
                            })

                    # Check if interview ended — post results immediately
                    # but keep connection alive until model finishes speaking.
                    if state.get("interview_ended") and not state.get("_end_result_posted"):
                        state["_end_result_posted"] = True
                        state["_end_timestamp"] = asyncio.get_event_loop().time()
                        logger.info("Interview ended, posting results (keeping connection for goodbye)")

                        transcript = state.get("transcript", [])
                        scores = state.get("scores", {})
                        cheating_signals = state.get("cheating_signals", [])
                        key_moments = [
                            {
                                "timestamp": float(s.get("timestamp", 0)) / 1000,
                                "type": s["signal_type"],
                                "description": s["detail"],
                            }
                            for s in cheating_signals
                        ]
                        result_data = {
                            "overall_score": scores.get("overall_score", 0),
                            "recommendation": scores.get("recommendation", "no_hire"),
                            "summary": scores.get("summary", "Interview completed."),
                            "transcript": [
                                {"speaker": t["speaker"], "text": t["text"], "timestamp": float(i)}
                                for i, t in enumerate(transcript)
                            ],
                            "score_breakdown": scores.get("score_breakdown", {
                                "communication": 0,
                                "technical_knowledge": 0,
                                "problem_solving": 0,
                                "coding_skills": 0,
                                "system_design": 0,
                            }),
                            "key_moments": key_moments,
                        }
                        await post_result(session_id, result_data)

                    # Track if model spoke after end_interview
                    if state.get("_end_result_posted"):
                        if model_speaking:
                            state["_model_spoke_after_end"] = True

                        # Close once model finishes goodbye, or after 15s timeout
                        time_since_end = asyncio.get_event_loop().time() - state.get("_end_timestamp", 0)
                        model_done = state.get("_model_spoke_after_end") and not model_speaking
                        timed_out = time_since_end > 15

                        if model_done or timed_out:
                            logger.info(f"Closing session (model_done={model_done}, timed_out={timed_out})")
                            await websocket.send_text(json.dumps({
                                "type": "interview_complete",
                                "message": "Interview has been completed. Results are being processed.",
                            }))
                            return  # Exit cleanly

                break  # Normal completion

            except WebSocketDisconnect:
                logger.info(f"Client disconnected during downstream: {session_token}")
                break
            except Exception as e:
                err_str = str(e)
                is_retryable = any(code in err_str for code in ("1008", "1007", "1011"))
                if is_retryable and attempt < max_retries:
                    logger.warning(
                        f"Connection error (attempt {attempt + 1}/{max_retries}): {err_str[:100]}, "
                        f"pausing realtime input and retrying..."
                    )
                    audio_gate.clear()
                    model_speaking = False
                    if gate_timeout_task and not gate_timeout_task.done():
                        gate_timeout_task.cancel()
                        gate_timeout_task = None
                    # Drain stale realtime audio so the new connection doesn't
                    # receive old bytes before it's initialized (causes 1007).
                    while not live_request_queue._queue.empty():
                        try:
                            live_request_queue._queue.get_nowait()
                        except asyncio.QueueEmpty:
                            break
                    await asyncio.sleep(2)

                    # Inject recovery context so model continues instead of
                    # restarting from the greeting.
                    state = get_session_state_by_token(session_token)
                    transcript = state.get("transcript", [])
                    if transcript:
                        recent = transcript[-6:]
                        recent_lines = "\n".join(
                            f"{'Clair' if t['speaker'] == 'clair' else 'Candidate'}: {t['text']}"
                            for t in recent
                        )
                        stage = state.get("current_stage", "experience")
                        recovery = (
                            "SYSTEM: The live audio connection was briefly interrupted and has been "
                            "automatically reconnected. You are currently in the "
                            f"'{stage}' stage of the interview. Continue the conversation "
                            "naturally from where you left off. Do NOT re-introduce yourself "
                            "or restart the interview.\n"
                            f"Recent conversation for context:\n{recent_lines}"
                        )
                        live_request_queue.send_content(types.Content(
                            parts=[types.Part(text=recovery)]
                        ))
                        logger.info(f"Injected recovery context ({len(transcript)} transcript entries)")

                    # Gate stays closed — will reopen when model produces audio
                    continue
                logger.error(f"Downstream error: {e}", exc_info=True)
                break

    async def gate_watchdog():
        """Periodically ensure the gate isn't stuck closed when model is idle.
        Also handles end-interview timeout when no more ADK events arrive."""
        while True:
            await asyncio.sleep(5)
            if not audio_gate.is_set():
                logger.warning(
                    f"Gate watchdog: gate has been closed, forcing re-open "
                    f"(session={session_token})"
                )
                audio_gate.set()

            # End-interview timeout — the downstream event loop may be stuck
            # waiting for events that never come after the model finishes.
            state = get_session_state_by_token(session_token)
            if state.get("_end_result_posted") and not state.get("_close_sent"):
                time_since = asyncio.get_event_loop().time() - state.get("_end_timestamp", 0)
                if time_since > 10:
                    state["_close_sent"] = True
                    logger.info(f"Gate watchdog: end-interview timeout ({time_since:.0f}s), closing session")
                    try:
                        await websocket.send_text(json.dumps({
                            "type": "interview_complete",
                            "message": "Interview has been completed. Results are being processed.",
                        }))
                    except Exception:
                        pass
                    live_request_queue.close()
                    return

    try:
        await asyncio.gather(
            upstream_task(),
            downstream_task(),
            gate_watchdog(),
            return_exceptions=True,
        )
    except Exception as e:
        logger.error(f"Session error: {e}", exc_info=True)
    finally:
        live_request_queue.close()
        # Clean up runner cache and per-session state
        _runners.pop(session_token, None)
        remove_session_state(session_token)
        logger.info(f"Session ended: {session_token}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=config.PORT)
