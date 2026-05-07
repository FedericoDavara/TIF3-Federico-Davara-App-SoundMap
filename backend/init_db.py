#!/usr/bin/env python3
"""
Script de inicialización para SoundMap+
Ayuda a configurar la base de datos y ejecutar migraciones
"""

import os
import sys
from sqlalchemy import create_engine
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def init_db():
    """Inicializa la base de datos"""
    print("🔧 Inicializando base de datos...")
    
    try:
        engine = create_engine(DATABASE_URL)
        
        # Intentar conexión
        with engine.connect() as conn:
            print("✅ Conexión a BD exitosa")
        
        # Crear tablas
        from app.database import Base
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas creadas exitosamente")
        
        return True
    except Exception as e:
        print(f"❌ Error al inicializar BD: {e}")
        return False

if __name__ == "__main__":
    if init_db():
        print("\n🎉 Base de datos inicializada correctamente")
        print("Puedes ejecutar: uvicorn app.main:app --reload")
    else:
        print("\n⚠️  Verifica tu configuración de .env")
        sys.exit(1)
