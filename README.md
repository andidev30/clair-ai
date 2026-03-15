# Clair AI

**An AI-powered technical interviewer that conducts realistic, real-time voice interviews.**

Recruiters create interview sessions, candidates join via a unique link, and Clair -- an AI voice persona powered by Gemini Live API -- interviews them in real-time with natural conversation, live screen observation, and adaptive follow-up questions.

Built for the [Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com) hackathon. #GeminiLiveAgentChallenge

---

## Features

- **Real-time voice interview** -- Bidirectional audio streaming via Gemini Live API. Clair speaks and listens simultaneously, just like a real phone call.
- **Natural barge-in** -- Candidates can interrupt Clair mid-sentence. An intelligent audio gating system handles interruptions gracefully.
- **Live screen observation** -- Clair watches the candidate's screen in real-time via Gemini Vision as they solve coding challenges, commenting on their approach and giving hints.
- **Adaptive conversation** -- Clair asks follow-up questions based on the candidate's actual answers, not a fixed script. Every interview is different.
- **Coding challenges** -- Integrated Monaco code editor with problems tailored to experience level (junior/mid/senior).
- **Integrity monitoring** -- Detects tab switching, large code pastes, and visible AI tools on the candidate's screen. Factors into scoring transparently.
- **Automated scoring** -- Generates a detailed score report across 5 dimensions (communication, technical knowledge, problem solving, coding skills, system design) with a hiring recommendation.
- **Distinct AI persona** -- Clair sounds like a real senior engineer: uses contractions, natural fillers ("hmm", "oh nice", "gotcha"), thinks out loud, and avoids AI-sounding cliches.

---

## Architecture

![Architecture](architecture.png)

### Data Flow

1. **Recruiter** logs in via Google OAuth, creates an interview with position details and tech stack requirements
2. **Recruiter** generates a session link with the candidate's name
3. **Candidate** opens the link, grants microphone access, and the interview begins
4. **AI Service** runs the Clair agent via Google ADK's `Runner.run_live()` with bidirectional audio streaming
5. Clair conducts a 4-stage interview: greeting, experience chat, coding challenge, wrap-up
6. During coding, the candidate's screen is captured at 1 FPS and sent to Gemini Vision for real-time observation
7. At the end, Clair calls the `end_interview` tool with scores, which are posted to the Go API via internal webhook
8. **Recruiter** views the detailed score report with transcript and integrity flags

---

## Tech Stack

| Layer          | Technology                                               |
| -------------- | -------------------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite, Material UI 7, Monaco Editor |
| API Backend    | Go 1.25, Fiber v2, JWT auth, Google OAuth                |
| AI Service     | Python 3.12, FastAPI, Google ADK, Gemini Live API        |
| Database       | Firestore Enterprise (MongoDB compatibility mode)        |
| Infrastructure | Google Cloud Run, Cloud Build, Container Registry        |

### Google Cloud Services Used

- **Cloud Run** -- Hosts all 3 services (UI, API, AI) as serverless containers
- **Cloud Build** -- CI/CD pipeline for building and deploying Docker images
- **Container Registry (GCR)** -- Stores Docker images
- **Firestore Enterprise** -- Database with MongoDB wire protocol compatibility
- **Gemini API** -- Powers the AI interviewer (model: `gemini-2.5-flash-preview-native-audio-dialog`)

### Google ADK Components Used

- `google.adk.agents.Agent` -- Agent definition with tools and instructions
- `google.adk.runners.Runner` -- Live execution with `run_live()` for bidi streaming
- `google.adk.agents.live_request_queue.LiveRequestQueue` -- Real-time audio/image queue
- `google.adk.tools.FunctionTool` -- Tool wrapping for agent capabilities
- `google.adk.sessions.InMemorySessionService` -- Session management

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A [Google Cloud](https://cloud.google.com/) account with a project
- A [Gemini API key](https://aistudio.google.com/apikey)
- A [Google OAuth Client ID](https://console.cloud.google.com/apis/credentials) (for recruiter login)

---

## Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone https://github.com/andidev30/clair-ai.git
cd clair-ai
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```bash
# Required
GOOGLE_API_KEY=your-gemini-api-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id

# Optional (defaults are fine for local dev)
INTERNAL_API_KEY=clair-ai-dev-key
```

### 3. Start all services

```bash
docker compose up --build
```

This starts:

- **MongoDB** on `localhost:27017`
- **API** (Go) on `localhost:3000`
- **AI Service** (Python) on `localhost:8001`
- **UI** (React) on `localhost:8080`

### 4. Open the app

Navigate to `http://localhost:8080` in your browser.

---

## Manual Setup (Without Docker)

<details>
<summary>Click to expand</summary>

### API Service (Go)

```bash
cd api
cp .env.example .env
# Edit .env with your values
go run main.go
```

### AI Service (Python)

```bash
cd ai
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your GOOGLE_API_KEY
python main.py
```

### UI (React)

```bash
cd ui
pnpm install
pnpm dev
```

</details>

---

## Environment Variables

### AI Service (`ai/.env`)

| Variable                    | Description                            | Default                                        |
| --------------------------- | -------------------------------------- | ---------------------------------------------- |
| `GOOGLE_API_KEY`            | Gemini API key from AI Studio          | (required)                                     |
| `GOOGLE_GENAI_USE_VERTEXAI` | Use Vertex AI instead of AI Studio     | `FALSE`                                        |
| `GOLANG_BACKEND_URL`        | URL of the Go API service              | `http://localhost:3000`                        |
| `INTERNAL_API_KEY`          | Shared key for service-to-service auth | `clair-ai-dev-key`                             |
| `AGENT_MODEL`               | Gemini model to use                    | `gemini-2.5-flash-preview-native-audio-dialog` |

### API Service (`api/.env`)

| Variable           | Description                            | Default                              |
| ------------------ | -------------------------------------- | ------------------------------------ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID                 | (required)                           |
| `JWT_SECRET`       | Secret for signing JWT tokens          | `clair-ai-dev-secret`                |
| `MONGO_URI`        | MongoDB connection string              | `mongodb://localhost:27017/clair_ai` |
| `INTERNAL_API_KEY` | Shared key for service-to-service auth | `clair-ai-dev-key`                   |
| `ALLOWED_ORIGINS`  | CORS allowed origins                   | `*`                                  |

---

## Cloud Deployment (Google Cloud)

### Prerequisites

- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated
- A GCP project with Cloud Build and Cloud Run APIs enabled

### Deploy

```bash
# Set your GCP project
gcloud config set project YOUR_PROJECT_ID

# Create .env.production with production values at the project root
cp .env.production.example .env.production
# Edit .env.production with your values

# Deploy all services (or choose: ai, api, ui)
./deploy.sh
```

### `.env.production` template

```bash
# ── AI Service ────────────────────────────────────────────────
GOOGLE_API_KEY=your-gemini-api-key
GOOGLE_GENAI_USE_VERTEXAI=FALSE
AGENT_MODEL=gemini-2.5-flash-preview-native-audio-dialog

# ── API Service ───────────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-oauth-client-id
JWT_SECRET=your-jwt-secret
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/clair_ai

# ── UI (React) ────────────────────────────────────────────────
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id

# ── Shared ────────────────────────────────────────────────────
INTERNAL_API_KEY=your-internal-api-key

# ── Service URLs (set after first deploy) ────────────────────
GOLANG_BACKEND_URL=https://api-xxxx-uc.a.run.app
ALLOWED_ORIGINS=https://ui-xxxx-uc.a.run.app
```

Each service is built via Cloud Build and deployed to Cloud Run in `us-central1`. The `cloudbuild.yaml` in each service directory handles:

1. Building the Docker image
2. Pushing to Google Container Registry
3. Deploying to Cloud Run with environment variables from `.env.production`

---

## Project Structure

```
clair-ai/
├── ai/                          # AI Service (Python/FastAPI)
│   ├── main.py                  # WebSocket server, audio gating, bidi streaming
│   ├── config.py                # Environment variable configuration
│   ├── interview_agent/
│   │   ├── agent.py             # ADK Agent definition with Gemini model
│   │   ├── prompts.py           # Clair's persona and interview instructions
│   │   └── tools.py             # Agent tools (coding challenge, screen observe, scoring)
│   ├── services/
│   │   └── webhook.py           # Posts results to Go API
│   ├── Dockerfile
│   └── cloudbuild.yaml
│
├── api/                         # API Service (Go/Fiber)
│   ├── main.go                  # HTTP server entry point
│   ├── handlers/                # Request handlers (auth, sessions, interviews, results)
│   ├── models/                  # Data models (user, interview, session, result)
│   ├── middleware/               # JWT auth middleware
│   ├── database/                # MongoDB/Firestore connection
│   ├── Dockerfile
│   └── cloudbuild.yaml
│
├── ui/                          # Frontend (React/TypeScript/Vite)
│   ├── src/
│   │   ├── pages/               # InterviewPage, ResultsPage, Dashboard, Login
│   │   ├── components/          # CodeEditor, AudioControls, InterviewChat, ScreenShare
│   │   ├── hooks/               # useWebSocket, useAudioStream, useScreenCapture
│   │   ├── api/                 # REST API client
│   │   └── context/             # Auth context (Google OAuth)
│   ├── Dockerfile
│   └── cloudbuild.yaml
│
├── deploy.sh                    # GCP deployment script (Cloud Build)
└── docker-compose.yml           # Local development setup
```

---

## How It Works

### Interview Flow

Clair follows a natural 4-stage interview:

1. **Greeting** -- Casual introduction, sets a relaxed tone
2. **Experience Chat** -- Discusses the candidate's background, asks follow-ups based on the role's tech stack
3. **Coding Challenge** -- Sends a difficulty-appropriate problem to the Monaco editor, observes the candidate's screen in real-time, gives hints when stuck
4. **Wrap-up** -- Thanks the candidate, reviews integrity signals, submits scores via the `end_interview` tool

### Agent Tools

| Tool                    | Purpose                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| `send_coding_challenge` | Pushes a problem to the candidate's code editor and triggers screen sharing     |
| `observe_screen`        | Returns the latest observation of the candidate's screen (code, AI tools, etc.) |
| `get_cheating_signals`  | Retrieves detected integrity events (tab switches, large pastes, AI tools)      |
| `end_interview`         | Submits final scores across 5 dimensions with a hiring recommendation           |

### Scoring

Each interview is scored on a 0-100 scale across 5 dimensions:

- **Communication** -- Clarity, structured thinking, asking good questions
- **Technical Knowledge** -- Understanding of concepts, frameworks, best practices
- **Problem Solving** -- Breaking down problems, approach, edge case handling
- **Coding Skills** -- Code quality, correctness, efficiency

Recommendations: `strong_hire` (90-100), `hire` (70-89), `no_hire` (50-69), `strong_no_hire` (0-49)

---

## Author

Built by [andidev30](https://g.dev/andidev30) for the [Gemini Live Agent Challenge](https://geminiliveagentchallenge.devpost.com) hackathon.

---

## License

MIT
