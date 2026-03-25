from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
import json

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# Password functions
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# Token functions
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Auth helper
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ContactCreate(BaseModel):
    name: Optional[str] = ""
    role: Optional[str] = ""
    email: Optional[str] = ""
    linkedin: Optional[str] = ""
    phone: Optional[str] = ""

class JobCreate(BaseModel):
    company: str
    title: str
    role: Optional[str] = ""
    status: Optional[str] = "Pending"
    priority: Optional[str] = "Medium"
    date: Optional[str] = ""
    link: Optional[str] = ""
    notes: Optional[str] = ""
    contacts: Optional[List[ContactCreate]] = []
    custom_fields: Optional[Dict[str, Any]] = {}

class JobUpdate(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    date: Optional[str] = None
    link: Optional[str] = None
    notes: Optional[str] = None
    contacts: Optional[List[ContactCreate]] = None
    custom_fields: Optional[Dict[str, Any]] = None

class CustomColumnCreate(BaseModel):
    name: str
    field_type: str  # text, number, date, dropdown, checkbox
    options: Optional[List[str]] = []  # For dropdown type

class CustomColumnUpdate(BaseModel):
    name: Optional[str] = None
    options: Optional[List[str]] = None

# Create the main app
app = FastAPI()

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth")
jobs_router = APIRouter(prefix="/jobs")
columns_router = APIRouter(prefix="/columns")

# Auth endpoints
@auth_router.post("/register")
async def register(user: UserRegister, response: Response):
    email = user.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": user.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": email, "name": user.name, "role": "user"}

@auth_router.post("/login")
async def login(user: UserLogin, request: Request, response: Response):
    email = user.email.lower()
    
    # Check brute force - use email only for more reliable tracking
    identifier = email
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_until = attempt.get("lockout_until")
        if lockout_until:
            lockout_time = datetime.fromisoformat(lockout_until.replace('Z', '+00:00')) if isinstance(lockout_until, str) else lockout_until
            if datetime.now(timezone.utc) < lockout_time:
                raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
            else:
                # Lockout expired, reset attempts
                await db.login_attempts.delete_one({"identifier": identifier})
    
    db_user = await db.users.find_one({"email": email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        # Increment failed attempts
        current_count = attempt.get("count", 0) if attempt else 0
        new_count = current_count + 1
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$set": {
                    "count": new_count,
                    "lockout_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat() if new_count >= 5 else None,
                    "last_attempt": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear failed attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(db_user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": email, "name": db_user.get("name", ""), "role": db_user.get("role", "user")}

@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Logged out"}

@auth_router.get("/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@auth_router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Jobs endpoints
@jobs_router.get("")
async def get_jobs(request: Request):
    user = await get_current_user(request)
    jobs = await db.jobs.find({"user_id": user["_id"]}, {"_id": 1, "company": 1, "title": 1, "role": 1, "status": 1, "priority": 1, "date": 1, "link": 1, "notes": 1, "contacts": 1, "custom_fields": 1, "created_at": 1, "updated_at": 1}).sort("created_at", -1).to_list(1000)
    for job in jobs:
        job["id"] = str(job.pop("_id"))
    return jobs

@jobs_router.post("", status_code=201)
async def create_job(job: JobCreate, request: Request):
    user = await get_current_user(request)
    job_doc = job.model_dump()
    job_doc["user_id"] = user["_id"]
    job_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    job_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    # Convert contacts to dict format
    job_doc["contacts"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in job_doc.get("contacts", [])]
    result = await db.jobs.insert_one(job_doc)
    job_doc["id"] = str(result.inserted_id)
    job_doc.pop("_id", None)
    job_doc.pop("user_id", None)
    return job_doc

@jobs_router.get("/{job_id}")
async def get_job(job_id: str, request: Request):
    user = await get_current_user(request)
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "user_id": user["_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job["id"] = str(job.pop("_id"))
    job.pop("user_id", None)
    return job

@jobs_router.put("/{job_id}")
async def update_job(job_id: str, job: JobUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in job.model_dump().items() if v is not None}
    if "contacts" in update_data:
        update_data["contacts"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in update_data["contacts"]]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "user_id": user["_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    updated = await db.jobs.find_one({"_id": ObjectId(job_id)})
    updated["id"] = str(updated.pop("_id"))
    updated.pop("user_id", None)
    return updated

@jobs_router.delete("/{job_id}")
async def delete_job(job_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.jobs.delete_one({"_id": ObjectId(job_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted"}

@jobs_router.post("/import")
async def import_jobs(request: Request):
    user = await get_current_user(request)
    body = await request.json()
    jobs_data = body.get("jobs", [])
    imported = 0
    for job in jobs_data:
        job_doc = {
            "company": job.get("company", ""),
            "title": job.get("title", ""),
            "role": job.get("role", ""),
            "status": job.get("status", "Pending"),
            "priority": job.get("priority", "Medium"),
            "date": job.get("date", ""),
            "link": job.get("link", ""),
            "notes": job.get("notes", ""),
            "contacts": job.get("contacts", []),
            "custom_fields": job.get("custom_fields", {}),
            "user_id": user["_id"],
            "created_at": job.get("created_at", datetime.now(timezone.utc).isoformat()),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.jobs.insert_one(job_doc)
        imported += 1
    return {"imported": imported}

@jobs_router.get("/export/all")
async def export_jobs(request: Request):
    user = await get_current_user(request)
    jobs = await db.jobs.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0}).to_list(10000)
    return {"jobs": jobs, "exported_at": datetime.now(timezone.utc).isoformat()}

# Custom columns endpoints
@columns_router.get("")
async def get_columns(request: Request):
    user = await get_current_user(request)
    columns = await db.custom_columns.find({"user_id": user["_id"]}, {"_id": 1, "name": 1, "field_type": 1, "options": 1, "created_at": 1}).to_list(100)
    for col in columns:
        col["id"] = str(col.pop("_id"))
    return columns

@columns_router.post("", status_code=201)
async def create_column(column: CustomColumnCreate, request: Request):
    user = await get_current_user(request)
    # Check if column name already exists
    existing = await db.custom_columns.find_one({"user_id": user["_id"], "name": column.name})
    if existing:
        raise HTTPException(status_code=400, detail="Column with this name already exists")
    
    col_doc = column.model_dump()
    col_doc["user_id"] = user["_id"]
    col_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.custom_columns.insert_one(col_doc)
    col_doc["id"] = str(result.inserted_id)
    col_doc.pop("_id", None)
    col_doc.pop("user_id", None)
    return col_doc

@columns_router.put("/{column_id}")
async def update_column(column_id: str, column: CustomColumnUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in column.model_dump().items() if v is not None}
    result = await db.custom_columns.update_one(
        {"_id": ObjectId(column_id), "user_id": user["_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Column not found")
    updated = await db.custom_columns.find_one({"_id": ObjectId(column_id)})
    updated["id"] = str(updated.pop("_id"))
    updated.pop("user_id", None)
    return updated

@columns_router.delete("/{column_id}")
async def delete_column(column_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.custom_columns.delete_one({"_id": ObjectId(column_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Column not found")
    return {"message": "Column deleted"}

# Stats endpoint
@api_router.get("/stats")
async def get_stats(request: Request):
    user = await get_current_user(request)
    pipeline = [
        {"$match": {"user_id": user["_id"]}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.jobs.aggregate(pipeline).to_list(100)
    
    # Priority counts
    priority_pipeline = [
        {"$match": {"user_id": user["_id"]}},
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]
    priority_counts = await db.jobs.aggregate(priority_pipeline).to_list(100)
    
    # Monthly applications
    monthly_pipeline = [
        {"$match": {"user_id": user["_id"]}},
        {"$addFields": {"month": {"$substr": ["$date", 0, 7]}}},
        {"$group": {"_id": "$month", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    monthly_counts = await db.jobs.aggregate(monthly_pipeline).to_list(100)
    
    total = await db.jobs.count_documents({"user_id": user["_id"]})
    
    return {
        "total": total,
        "by_status": {item["_id"]: item["count"] for item in status_counts if item["_id"]},
        "by_priority": {item["_id"]: item["count"] for item in priority_counts if item["_id"]},
        "monthly": [{"month": item["_id"], "count": item["count"]} for item in monthly_counts if item["_id"]]
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Job Tracker API"}

# Include routers
api_router.include_router(auth_router)
api_router.include_router(jobs_router)
api_router.include_router(columns_router)
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Startup event
@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.jobs.create_index([("user_id", 1), ("created_at", -1)])
    await db.custom_columns.create_index([("user_id", 1), ("name", 1)], unique=True)
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Admin password updated: {admin_email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
