"""Fake-login auth API.

This backs a login screen only. There is deliberately no route protection
or token verification beyond reading the signed session cookie - see PREL-4
("no authentication, just bring the user into platform").
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import Credentials, UserOut
from app.security import hash_password, verify_password

router = APIRouter(prefix="/api", tags=["auth"])

SESSION_USER_KEY = "user_id"


def _login(request: Request, user: User) -> None:
    request.session[SESSION_USER_KEY] = user.id


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    user_id = request.session.get(SESSION_USER_KEY)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    user = db.get(User, user_id)
    if user is None:
        # Stale cookie pointing at a user the (throwaway) DB no longer has.
        request.session.clear()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(body: Credentials, request: Request, db: Session = Depends(get_db)) -> User:
    email = body.email.lower()
    user = User(email=email, password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "An account with that email already exists"
        ) from None
    db.refresh(user)
    _login(request, user)
    return user


@router.post("/auth/login", response_model=UserOut)
def login(body: Credentials, request: Request, db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Incorrect email or password"
        )
    _login(request, user)
    return user


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response) -> Response:
    request.session.clear()
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)) -> User:
    return user
