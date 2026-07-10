# AI Market Research Analyst

A multi-agent AI platform that automates market research end-to-end, from gathering evidence to producing a polished, structured report, using LangGraph orchestration and Retrieval-Augmented Generation (RAG) to keep every insight grounded in real data.

Built as a full-stack product: a FastAPI backend running an agentic research pipeline, and a React frontend for generating, reviewing, and managing reports.

## Overview

Generic LLM research tools tend to hallucinate or produce shallow, generic output. This project addresses that with a coordinated team of specialized agents that plan, gather, verify, and write, each with a single responsibility, combined with a Pinecone-backed RAG layer that grounds the final report in retrieved business data instead of the model's raw memory.

## How It Works

The pipeline is orchestrated as a stateful graph with LangGraph, with SQLite-backed checkpointing so long-running research jobs can resume reliably. A **Scout** agent (with an **Enhanced Scout** variant) plans the research and gathers relevant evidence, including live web data. A **Synthesizer** agent then merges and structures the collected evidence into coherent findings. A **Critic** agent reviews those findings for gaps, weak evidence, or inconsistencies before a final **Reporter** agent writes the structured market research report from the validated findings.

## Key Features

Multi-agent orchestration with LangGraph covering the full plan, research, synthesize, critique, and report cycle. RAG-grounded output using Pinecone vector search plus HuggingFace embeddings to reduce hallucination. Secure authentication with JWT and Google OAuth2. Configurable report templates for different research and analysis types. Report history, search, and analytics on the frontend. Redis caching plus SQLAlchemy/SQLite persistence for performance and reliability, and an async, production-oriented FastAPI backend with Pydantic validation throughout.

## Tech Stack

Backend: FastAPI, LangChain, LangGraph, langgraph-checkpoint-sqlite, Pinecone, HuggingFace Sentence Transformers, SQLAlchemy, Redis, Google OAuth2, JWT (python-jose).
Frontend: React 18, React Router, Tailwind CSS, Framer Motion, React Query, Axios.
Infra: Docker, environment-based configuration.

## Project Structure

```
backend/
├── agents/        agents: scout, enhanced_scout, synthesizer, critic, reporter
├── routers/        FastAPI route definitions
├── services/        business logic
├── models/        data models
├── db/            database layer
├── tools/         agent tools (e.g. web retrieval)
└── main.py        FastAPI app entrypoint

frontend/
└── src/
    components/    UI components
    context/       auth and research state
    pages/         dashboard, research generator, reports, profile
    services/      API client
```

## Getting Started

Prerequisites: Python 3.10+, Node.js 18+, a running Redis instance, and API keys for Pinecone and Groq (for LLM access).

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python main.py
```

Remember to fill in your API keys and configuration inside the new `.env` file before starting the server.

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend expects the backend at `http://localhost:8000` by default, configurable via `REACT_APP_API_URL`.

## Roadmap

Planned improvements include additional report export formats (PDF, DOCX), team/workspace collaboration features, and expanded data source integrations.

## Author

Built by **Arslan Arshad**, Full-Stack & AI Engineer.
Portfolio: https://arslan-arshad.netlify.app/ · Email: arslanarshad1018@gmail.com
