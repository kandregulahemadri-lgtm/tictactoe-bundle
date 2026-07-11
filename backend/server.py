from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt as pyjwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

# ---------- Config ----------
JWT_ALGORITHM = "HS256"
ACCESS_TTL_MIN = 60 * 24  # 24 hours (fun, casual app)
REFRESH_TTL_DAYS = 30

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def _jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
    }
    return pyjwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS),
    }
    return pyjwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie(
        key="access_token", value=access, httponly=True, secure=True,
        samesite="none", max_age=ACCESS_TTL_MIN * 60, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh, httponly=True, secure=True,
        samesite="none", max_age=REFRESH_TTL_DAYS * 86400, path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def _user_public(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "email": u["email"],
        "name": u.get("name", ""),
        "avatar": u.get("avatar", "🙂"),
        "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=40)
    avatar: str = Field(default="🙂", max_length=8)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=40)
    avatar: Optional[str] = Field(default=None, max_length=8)


class MatchIn(BaseModel):
    player_x_name: str = Field(min_length=1, max_length=40)
    player_x_avatar: str = Field(max_length=8)
    player_o_name: str = Field(min_length=1, max_length=40)
    player_o_avatar: str = Field(max_length=8)
    winner: str  # "X", "O", or "DRAW"
    moves: int
    duration_seconds: int


# ---------- Auth endpoints ----------
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "avatar": payload.avatar or "🙂",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    user_id = str(result.inserted_id)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return _user_public(doc)


@api_router.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return _user_public(user)


@api_router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return _user_public(user)


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(
            key="access_token", value=access, httponly=True, secure=True,
            samesite="none", max_age=ACCESS_TTL_MIN * 60, path="/",
        )
        return {"ok": True}
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api_router.patch("/auth/profile")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates = {}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.avatar is not None:
        updates["avatar"] = payload.avatar
    if updates:
        await db.users.update_one({"_id": user["_id"]}, {"$set": updates})
        user.update(updates)
    return _user_public(user)


# ---------- Matches ----------
@api_router.post("/matches")
async def create_match(payload: MatchIn, user: dict = Depends(get_current_user)):
    if payload.winner not in ("X", "O", "DRAW"):
        raise HTTPException(status_code=400, detail="Invalid winner")
    match_doc = {
        "id": str(uuid.uuid4()),
        "user_id": str(user["_id"]),
        "player_x_name": payload.player_x_name,
        "player_x_avatar": payload.player_x_avatar,
        "player_o_name": payload.player_o_name,
        "player_o_avatar": payload.player_o_avatar,
        "winner": payload.winner,
        "moves": payload.moves,
        "duration_seconds": payload.duration_seconds,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.matches.insert_one(match_doc)
    match_doc.pop("_id", None)
    return match_doc


@api_router.get("/matches")
async def list_matches(user: dict = Depends(get_current_user)):
    cursor = db.matches.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("created_at", -1).limit(100)
    matches = await cursor.to_list(length=100)
    return matches


@api_router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    cursor = db.matches.find({"user_id": str(user["_id"])}, {"_id": 0})
    matches = await cursor.to_list(length=1000)
    x_wins = sum(1 for m in matches if m["winner"] == "X")
    o_wins = sum(1 for m in matches if m["winner"] == "O")
    draws = sum(1 for m in matches if m["winner"] == "DRAW")
    total = len(matches)
    return {
        "total": total,
        "x_wins": x_wins,
        "o_wins": o_wins,
        "draws": draws,
        "win_rate": round((x_wins + o_wins) / total * 100, 1) if total else 0.0,
    }


@api_router.get("/")
async def root():
    return {"message": "Tic Tac Toe API"}


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.matches.create_index([("user_id", 1), ("created_at", -1)])


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
