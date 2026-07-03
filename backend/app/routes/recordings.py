from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.database import get_db
from app import models, schemas, auth
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import base64
import io

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
        min_noise_level=recording.min_noise_level or 0,
        max_noise_level=recording.max_noise_level or 0,
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
    print(f"📡 Buscando grabaciones para usuario: {current_user.id} ({current_user.email})")
    
    recordings = db.query(models.AudioRecording).filter(
        models.AudioRecording.user_id == current_user.id
    ).order_by(models.AudioRecording.created_at.desc()).all()
    
    print(f"✅ Encontradas {len(recordings)} grabaciones")
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
    db: Session = Depends(get_db)
):
    """
    Obtiene una grabación específica con audio en base64
    Permite que cualquiera escuche la grabación (sin restricción de user_id)
    """
    recording = db.query(models.AudioRecording).filter(
        models.AudioRecording.id == recording_id
    ).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Grabación no encontrada")
    
    return recording


@router.get("/{recording_id}/debug")
def debug_recording(
    recording_id: int,
    db: Session = Depends(get_db)
):
    """
    Debug endpoint para verificar el audio
    """
    recording = db.query(models.AudioRecording).filter(
        models.AudioRecording.id == recording_id
    ).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Grabación no encontrada")
    
    audio_data = recording.audio_data
    if audio_data:
        audio_b64 = base64.b64encode(audio_data).decode('utf-8')
        return {
            "id": recording.id,
            "audio_bytes_size": len(audio_data),
            "audio_b64_length": len(audio_b64),
            "first_100_chars": audio_b64[:100],
            "description": recording.description,
            "noise_level": recording.noise_level
        }
    
    return {"error": "No audio data"}


@router.get("/{recording_id}/audio")
def get_recording_audio(
    recording_id: int,
    db: Session = Depends(get_db)
):
    """
    Devuelve el audio como blob (no base64) para reproducción directa
    """
    recording = db.query(models.AudioRecording).filter(
        models.AudioRecording.id == recording_id
    ).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Grabación no encontrada")
    
    if not recording.audio_data:
        raise HTTPException(status_code=404, detail="No hay datos de audio")
    
    return StreamingResponse(
        io.BytesIO(recording.audio_data),
        media_type="audio/webm",
        headers={"Content-Disposition": f"attachment; filename=recording_{recording_id}.webm"}
    )


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


# Schemas para estadísticas
class HourlyStats(BaseModel):
    hour: int
    average_noise: float
    min_noise: float
    max_noise: float
    count: int


class ClusterStatistics(BaseModel):
    latitude: float
    longitude: float
    average_noise: float
    min_noise: float
    max_noise: float
    total_recordings: int
    hourly_stats: List[HourlyStats]
    recordings_by_description: dict


@router.get("/statistics/cluster")
def get_cluster_statistics(
    latitude: float,
    longitude: float,
    radius_km: float = 1,
    days_back: int = 30,
    db: Session = Depends(get_db)
):
    """
    Obtiene estadísticas de ruido para un área específica (cluster)
    - radius_km: radio en kilómetros para considerar
    - days_back: días anteriores a incluir en análisis
    """
    from sqlalchemy import and_, between
    from math import radians, cos, sin, asin, sqrt
    
    # Calcular fecha límite
    date_limit = datetime.utcnow() - timedelta(days=days_back)
    
    # Obtener grabaciones en el área (aproximado con lat/lon)
    # En producción, usar PostGIS sería más preciso
    tolerance = radius_km / 111  # Aproximado: 1 grado ≈ 111 km
    
    recordings = db.query(models.AudioRecording).filter(
        and_(
            between(models.AudioRecording.latitude, latitude - tolerance, latitude + tolerance),
            between(models.AudioRecording.longitude, longitude - tolerance, longitude + tolerance),
            models.AudioRecording.created_at >= date_limit
        )
    ).all()
    
    if not recordings:
        return {
            "latitude": latitude,
            "longitude": longitude,
            "average_noise": 0,
            "min_noise": 0,
            "max_noise": 0,
            "total_recordings": 0,
            "hourly_stats": [],
            "recordings_by_description": {}
        }
    
    # Calcular estadísticas generales
    noise_levels = [r.noise_level for r in recordings]
    average_noise = sum(noise_levels) / len(noise_levels)
    min_noise = min(noise_levels)
    max_noise = max(noise_levels)
    
    # Agrupar por hora
    hourly_stats = {}
    descriptions_count = {}
    
    for recording in recordings:
        hour = recording.created_at.hour
        desc = recording.description or "Sin clasificación"
        
        if hour not in hourly_stats:
            hourly_stats[hour] = []
        hourly_stats[hour].append(recording.noise_level)
        
        if desc not in descriptions_count:
            descriptions_count[desc] = 0
        descriptions_count[desc] += 1
    
    # Formatear estadísticas por hora
    hourly_data = []
    for hour in range(24):
        if hour in hourly_stats:
            values = hourly_stats[hour]
            hourly_data.append({
                "hour": hour,
                "average_noise": round(sum(values) / len(values), 2),
                "min_noise": round(min(values), 2),
                "max_noise": round(max(values), 2),
                "count": len(values)
            })
        else:
            hourly_data.append({
                "hour": hour,
                "average_noise": 0,
                "min_noise": 0,
                "max_noise": 0,
                "count": 0
            })
    
    return {
        "latitude": latitude,
        "longitude": longitude,
        "average_noise": round(average_noise, 2),
        "min_noise": round(min_noise, 2),
        "max_noise": round(max_noise, 2),
        "total_recordings": len(recordings),
        "hourly_stats": hourly_data,
        "recordings_by_description": descriptions_count
    }
