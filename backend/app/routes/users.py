from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=schemas.User)
def get_current_user_info(
    current_user: models.User = Depends(auth.get_current_user)
):
    return current_user
