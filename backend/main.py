from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import research, auth, notifications, vector_db, documents, templates, websocket
from database import create_tables

app = FastAPI(title="Market Research Generator")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()

app.include_router(auth.router)
app.include_router(research.router)
app.include_router(notifications.router)
app.include_router(vector_db.router)
app.include_router(documents.router)
app.include_router(templates.router)
app.include_router(websocket.router)

@app.get("/")
def read_root():
    return {"message": "Market Research Generator API is live!"}