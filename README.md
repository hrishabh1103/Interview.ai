# Interviewer.AI

A production-quality MVP for simulating resume-based interviews with AI.

## Features
- **Resume Parsing**: Upload a PDF to generate context-aware questions.
- **AI Interviewer**: Text-based chat with a persona customized to the role.
- **Live Scoring**: Real-time evaluation of answers on Correctness, Depth, Structure, and Communication.
- **Comprehensive Report**: Downloadable PDF report with strengths, weaknesses, and a 7-day improvement plan.
- **Voice Mode (Beta)**: Push-to-talk integration (requires Google Cloud credentials).

## Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Shadcn UI
- **Backend**: FastAPI, LangGraph, Google Gemini, SQLite (Default)/Postgres
- **Infrastructure**: Docker Compose

## Requirements
- Docker & Docker Compose
- Google Gemini API Key

## Setup

1. **Clone the repository**
2. **Environment Variables**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and valid `GOOGLE_API_KEY`.
   Optionally add `GOOGLE_APPLICATION_CREDENTIALS` json path for Voice Mode.

3. **Run with Docker**
   ```bash
   docker-compose up --build
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - Docs: http://localhost:8000/docs

## Development

### Backend (Local)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (Local)
```bash
cd frontend
npm install
npm run dev
```

## Testing Milestone 1 (Text-only)
1. Go to `http://localhost:3000`.
2. Click "Start Interview".
3. Upload `sample_resume.pdf` (provided in root) or your own.
4. Select "SDE1" / "Easy" / "5 Questions".
5. Enter text answers in the chat.
6. Verify live scoreboard updates.
7. After 5 questions, click "View Results" or check the report.
8. Download the PDF report.

## Directory Structure
- `/backend`: FastAPI app
  - `/app/graph.py`: LangGraph logic
  - `/app/services`: PDF, Voice, LLM services
- `/frontend`: Next.js app
  - `/app/interview`: Chat interface
  - `/app/report`: Report visualization
# Interview.ai
# Interview.ai
