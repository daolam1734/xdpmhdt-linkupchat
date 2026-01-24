# Enterprise Chat App - Setup Guide

## Tech Stack
- **FE:** React + TypeScript + Vite + Zustand + Tailwind
- **BE:** FastAPI + PostgreSQL + Redis + Gemini AI
- **Docker:** Full orchestration for DB, Redis, and App

## Quick Start (with Docker)
1. Ensure you have Docker and Docker Compose installed.
2. Update your `GOOGLE_API_KEY` in `.env`.
3. Run the following command:
   ```bash
   docker-compose up --build
   ```

## Local Development (without Docker)
### Backend
1. Create a Python virtual env and install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run PostgreSQL and Redis locally or update `.env` to point to your instances.
3. Start the server:
   ```bash
   uvicorn backend.app.main:app --reload
   ```

### Frontend
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start Dev server:
   ```bash
   npm run dev
   ```

## Architecture
- `backend/app/core`: Configuration and Security (JWT).
- `backend/app/db`: Database session management.
- `backend/app/models`: SQLAlchemy data models.
- `backend/app/api`: Modular API endpoints (Auth, Chat, WebSocket).
