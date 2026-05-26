from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.database import Base, engine
from app.routes import auth, users, recordings

load_dotenv()

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SoundMap+ API", version="1.0.0")

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(recordings.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to SoundMap+ API"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
