from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth
from typing import List
import base64

router = APIRouter(prefix="/api/recordings", tags=["recordings"])


@router.post("/upload", response_model=schemas.AudioRecording)
def upload_recording(
    recording: schemas.AudioRecordingCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sube una grabación de audio con ubicación y nivel de ruido
    """
    # Convertir audio base64 a bytes para almacenarla
    try:
        audio_bytes = base64.b64decode(recording.audio_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Audio data inválido: {str(e)}")
    
    # Crear nuevo registro de grabación
    db_recording = models.AudioRecording(
        user_id=current_user.id,
        latitude=recording.latitude,
        longitude=recording.longitude,
        noise_level=recording.noise_level,
        audio_data=audio_bytes,
        description=recording.description
    )
    
    db.add(db_recording)
    db.commit()
    db.refresh(db_recording)
    
    return db_recording
def upload_recording(
    recording: schemas.AudioRecordingCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sube una grabación de audio con ubicación y nivel de ruido
    """
    # Convertir audio base64 a bytes para almacenarla
    try:
        audio_bytes = base64.b64decode(recording.audio_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Audio data inválido: {str(e)}")
    
    # Crear nuevo registro de grabación
    db_recording = models.AudioRecording(
        user_id=current_user.id,
        latitude=recording.latitude,
        longitude=recording.longitude,
        noise_level=recording.noise_level,
        audio_data=audio_bytes,
        description=recording.description
    )
    
    db.add(db_recording)
    db.commit()
    db.refresh(db_recording)
    
    return db_recording


@router.get("/me", response_model=List[schemas.AudioRecording])
def get_user_recordings(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene todas las grabaciones del usuario actual (sin audio para ir rápido)
    """
    recordings = db.query(models.AudioRecording).filter(
        models.AudioRecording.user_id == current_user.id
    ).order_by(models.AudioRecording.created_at.desc()).all()
    return recordings


@router.get("/all", response_model=List[schemas.AudioRecording])
def get_all_recordings(
    db: Session = Depends(get_db)
):
    """
    Obtiene todas las grabaciones (para mostrar en el mapa)
    """
    recordings = db.query(models.AudioRecording).all()
    return recordings


@router.get("/{recording_id}", response_model=schemas.AudioRecordingWithAudio)
def get_recording_by_id(
    recording_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene una grabación específica con audio en base64
    """
    recording = db.query(models.AudioRecording).filter(
        models.AudioRecording.id == recording_id
    ).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Grabación no encontrada")
    if recording.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver esta grabación")
    return recording


@router.delete("/{recording_id}")
def delete_recording(
    recording_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Elimina una grabación específica del usuario
    """
    recording = db.query(models.AudioRecording).filter(
        models.AudioRecording.id == recording_id
    ).first()
    
    if not recording:
        raise HTTPException(status_code=404, detail="Grabación no encontrada")
    
    if recording.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta grabación")
    
    db.delete(recording)
    db.commit()
    
    return {"message": "Grabación eliminada exitosamente"}
