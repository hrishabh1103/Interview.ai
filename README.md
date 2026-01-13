# Interviewer.AI 🤖🎤

An AI-powered mock interview platform that conducts real-time technical interviews, evaluates your responses, and generates detailed performance reports with PDF export.

## Features

*   **AI Interviewer**: Conducts dynamic, context-aware technical interviews using LLMs (Gemini or Ollama).
*   **Voice Mode** 🗣️: 
    *   **High-Quality TTS**: AI speaks with natural "Neural" voices (via Microsoft Edge TTS).
    *   **Browser-Native STT**: Speak your answers using the browser's built-in dictation (no API keys required).
*   **Live Scoreboard** 📊: Real-time feedback on Correctness, Depth, Structure, and Communication.
*   **PDF Reports** 📄: Download extensive performance reviews with actionable feedback.
*   **Resume Analysis**: Upload your resume to get tailored questions.

## Tech Stack

*   **Backend**: Python, FastAPI, LangGraph, LangChain, FPDF2, Edge-TTS.
*   **Frontend**: Next.js (React), Tailwind CSS, Lucide Icons.
*   **AI Models**: Google Gemini (Cloud) or Ollama (Local).

## Setup & Run

### Prerequisites
*   Node.js & npm
*   Python 3.11+
*   Google Gemini API Key (or local Ollama setup)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Create .env file
cp ../.env.example .env
# Edit .env and add your GEMINI_API_KEY
```

Run the server:
```bash
uvicorn app.main:app --reload
```
Server runs at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
App runs at `http://localhost:3000`.

## Configuration (.env)

| Variable | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Your Google AI API Key (Required for Gemini) |
| `LLM_PROVIDER` | `google` (default) or `ollama` |
| `OLLAMA_BASE_URL` | URL for local Ollama (e.g. `http://localhost:11434`) |

## How to Use Voice Mode
1.  Ensure backend is running.
2.  On the Interview screen, you'll see a **"Voice Mode Active"** indicator.
3.  The AI will automatically speak its questions.
4.  Click the **"Speak"** button (microphone icon) to dictate your answer.
