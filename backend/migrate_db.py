#!/usr/bin/env python3
"""
Script para migrar la base de datos y agregar columnas faltantes
"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            # Verificar si las columnas existen
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'audio_recordings' 
                AND column_name IN ('min_noise_level', 'max_noise_level')
            """))
            
            existing_columns = [row[0] for row in result]
            
            # Agregar min_noise_level si no existe
            if 'min_noise_level' not in existing_columns:
                print("✅ Agregando columna min_noise_level...")
                connection.execute(text("""
                    ALTER TABLE audio_recordings 
                    ADD COLUMN min_noise_level FLOAT DEFAULT 0
                """))
                connection.commit()
            
            # Agregar max_noise_level si no existe
            if 'max_noise_level' not in existing_columns:
                print("✅ Agregando columna max_noise_level...")
                connection.execute(text("""
                    ALTER TABLE audio_recordings 
                    ADD COLUMN max_noise_level FLOAT DEFAULT 0
                """))
                connection.commit()
            
            print("✅ Migración completada exitosamente")
            
    except Exception as e:
        print(f"❌ Error durante la migración: {str(e)}")
        raise

if __name__ == "__main__":
    migrate()
