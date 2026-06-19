#!/usr/bin/env python3
"""Script para crear una grabación de prueba en la BD"""

import sys
import base64
from app.database import SessionLocal
from app import models

def create_test_recording():
    """Crea una grabación de prueba con audio simulado"""
    db = SessionLocal()
    
    try:
        # Buscar un usuario existente (testuser creado anteriormente)
        user = db.query(models.User).filter(
            models.User.username == "testuser"
        ).first()
        
        if not user:
            print("No se encontró el usuario 'testuser'. Por favor, regístrate primero.")
            return False
        
        # Crear datos de audio simulados (un archivo WAV simple vacío o pequeño)
        # Aquí generamos un WAV mínimo válido
        wav_header = bytes([
            # RIFF header
            0x52, 0x49, 0x46, 0x46,  # "RIFF"
            0x24, 0x00, 0x00, 0x00,  # Tamaño del archivo (36 bytes)
            0x57, 0x41, 0x56, 0x45,  # "WAVE"
            
            # fmt subchunk
            0x66, 0x6D, 0x74, 0x20,  # "fmt "
            0x10, 0x00, 0x00, 0x00,  # Tamaño del subchunk (16)
            0x01, 0x00,              # Audio format (1 = PCM)
            0x01, 0x00,              # Número de canales (1 = mono)
            0x44, 0xAC, 0x00, 0x00,  # Sample rate (44100 Hz)
            0x88, 0x58, 0x01, 0x00,  # Byte rate (44100 * 2)
            0x02, 0x00,              # Block align
            0x10, 0x00,              # Bits per sample (16)
            
            # data subchunk
            0x64, 0x61, 0x74, 0x61,  # "data"
            0x00, 0x00, 0x00, 0x00,  # Tamaño de los datos (0)
        ])
        
        # Crear la grabación
        recording = models.AudioRecording(
            user_id=user.id,
            latitude=-32.8895,  # Mendoza
            longitude=-68.8458,
            noise_level=65.5,
            audio_data=wav_header,
            description="Grabación de prueba - Tráfico urbano"
        )
        
        db.add(recording)
        db.commit()
        db.refresh(recording)
        
        print(f"✓ Grabación de prueba creada exitosamente!")
        print(f"  ID: {recording.id}")
        print(f"  Usuario: {user.username}")
        print(f"  Descripción: {recording.description}")
        print(f"  Ubicación: {recording.latitude}, {recording.longitude}")
        print(f"  Nivel de ruido: {recording.noise_level} dB")
        
        return True
        
    except Exception as e:
        print(f"✗ Error al crear la grabación: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = create_test_recording()
    sys.exit(0 if success else 1)
