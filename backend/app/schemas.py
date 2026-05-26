from pydantic import BaseModel, EmailStr, ConfigDict, field_serializer
from datetime import datetime
from typing import Optional
import base64


class UserCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    email: EmailStr
    password: str


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    username: str
    created_at: datetime
    updated_at: Optional[datetime]


class Token(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    access_token: str
    token_type: str


class TokenData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    email: Optional[str] = None


class AudioRecordingCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    latitude: float
    longitude: float
    noise_level: float
    audio_data: str  # Base64 encoded audio
    description: Optional[str] = None


class AudioRecording(BaseModel):
    """Schema para listar grabaciones SIN audio_data"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    latitude: float
    longitude: float
    noise_level: float
    description: Optional[str]
    timestamp: datetime
    created_at: datetime


class AudioRecordingWithAudio(BaseModel):
    """Schema para obtener grabación CON audio_data en base64"""
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    latitude: float
    longitude: float
    noise_level: float
    description: Optional[str]
    timestamp: datetime
    created_at: datetime
    audio_data: Optional[str] = None

    @field_serializer('audio_data')
    def serialize_audio_data(self, value):
        if value is None:
            return None
        if isinstance(value, bytes):
            return base64.b64encode(value).decode('utf-8')
        return value

