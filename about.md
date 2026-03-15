## Inspiration

Scheduling technical interviews is a mess. And even when you get everyone
in the room, the experience is inconsistent — different interviewers,
different standards, different moods.

We wanted to build an interviewer that's always prepared, always consistent,
and actually listens. Not a chatbot with a question list. A real conversation.

## What it does

Clair is an AI technical interviewer with two sides:

Recruiters set up an interview in minutes — role, level, tech stack — and
get a shareable link to send to candidates. After the interview, they get
a full score report with transcript and recommendation.

Candidates join the link and have a real voice conversation with Clair.
She asks about their background, digs into their answers, gives them a
coding challenge in a browser IDE, and watches their screen as they code —
commenting in real-time without them ever having to "submit" anything.
The whole thing feels surprisingly like talking to an actual engineer.

## How we built it

Three services, each with a clear job:

- **React** — candidate interview page (voice, screen share via
  getDisplayMedia, Monaco Editor) + recruiter dashboard
- **Golang on Cloud Run** — session management, generates interview links,
  receives score report from AI service via webhook, serves results to recruiter
- **Python ADK on Cloud Run** — the brain. Orchestrates interview stages
  using ADK, handles real-time voice via Gemini Live API bidi streaming,
  watches the candidate's screen via Gemini Vision, generates score report
  at the end and POSTs it to Golang

Database: Firestore Enterprise with MongoDB compatibility mode — native GCP,
familiar driver syntax.

## Challenges we ran into

Getting Clair to actually listen was harder than expected. Early versions
felt like she was running a checklist — she'd ask about PostgreSQL right
after the candidate mentioned they use MySQL. Fixing this meant iterating
heavily on the system prompt using real transcripts until the follow-ups
felt genuinely adaptive.

Barge-in handling was also tricky. Getting interrupted mid-sentence without
losing context required careful state management in the ADK agent.

## Accomplishments that we're proud of

Clair commenting on code she's watching in real-time — without the candidate
submitting anything — is the moment that makes people go "wait, how did she
know that?" That one took a while to get right and it's worth it.

## What we learned

ADK is the right tool for long, stateful conversations. A single prompt
would have fallen apart halfway through the interview. Persona consistency
is also way more of a product problem than a technical one — the system
prompt for Clair went through more iterations than any piece of code.

## What's next for Clair AI

- Custom question banks for recruiters
