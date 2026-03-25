from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Default user ID for non-auth mode
DEFAULT_USER_ID = "default_user"

# Models
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
jobs_router = APIRouter(prefix="/jobs")
columns_router = APIRouter(prefix="/columns")

# Jobs endpoints
@jobs_router.get("")
async def get_jobs():
    jobs = await db.jobs.find({"user_id": DEFAULT_USER_ID}, {"_id": 1, "company": 1, "title": 1, "role": 1, "status": 1, "priority": 1, "date": 1, "link": 1, "notes": 1, "contacts": 1, "custom_fields": 1, "created_at": 1, "updated_at": 1}).sort("created_at", -1).to_list(1000)
    for job in jobs:
        job["id"] = str(job.pop("_id"))
    return jobs

@jobs_router.post("", status_code=201)
async def create_job(job: JobCreate):
    job_doc = job.model_dump()
    job_doc["user_id"] = DEFAULT_USER_ID
    job_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    job_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    job_doc["contacts"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in job_doc.get("contacts", [])]
    result = await db.jobs.insert_one(job_doc)
    job_doc["id"] = str(result.inserted_id)
    job_doc.pop("_id", None)
    job_doc.pop("user_id", None)
    return job_doc

@jobs_router.get("/{job_id}")
async def get_job(job_id: str):
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "user_id": DEFAULT_USER_ID})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job["id"] = str(job.pop("_id"))
    job.pop("user_id", None)
    return job

@jobs_router.put("/{job_id}")
async def update_job(job_id: str, job: JobUpdate):
    update_data = {k: v for k, v in job.model_dump().items() if v is not None}
    if "contacts" in update_data:
        update_data["contacts"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in update_data["contacts"]]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.jobs.update_one(
        {"_id": ObjectId(job_id), "user_id": DEFAULT_USER_ID},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    updated = await db.jobs.find_one({"_id": ObjectId(job_id)})
    updated["id"] = str(updated.pop("_id"))
    updated.pop("user_id", None)
    return updated

@jobs_router.delete("/{job_id}")
async def delete_job(job_id: str):
    result = await db.jobs.delete_one({"_id": ObjectId(job_id), "user_id": DEFAULT_USER_ID})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted"}

@jobs_router.post("/import")
async def import_jobs(request: Request):
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
            "user_id": DEFAULT_USER_ID,
            "created_at": job.get("created_at", datetime.now(timezone.utc).isoformat()),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.jobs.insert_one(job_doc)
        imported += 1
    return {"imported": imported}

@jobs_router.get("/export/all")
async def export_jobs():
    jobs = await db.jobs.find({"user_id": DEFAULT_USER_ID}, {"_id": 0, "user_id": 0}).to_list(10000)
    return {"jobs": jobs, "exported_at": datetime.now(timezone.utc).isoformat()}

# Custom columns endpoints
@columns_router.get("")
async def get_columns():
    columns = await db.custom_columns.find({"user_id": DEFAULT_USER_ID}, {"_id": 1, "name": 1, "field_type": 1, "options": 1, "created_at": 1}).to_list(100)
    for col in columns:
        col["id"] = str(col.pop("_id"))
    return columns

@columns_router.post("", status_code=201)
async def create_column(column: CustomColumnCreate):
    existing = await db.custom_columns.find_one({"user_id": DEFAULT_USER_ID, "name": column.name})
    if existing:
        raise HTTPException(status_code=400, detail="Column with this name already exists")
    
    col_doc = column.model_dump()
    col_doc["user_id"] = DEFAULT_USER_ID
    col_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.custom_columns.insert_one(col_doc)
    col_doc["id"] = str(result.inserted_id)
    col_doc.pop("_id", None)
    col_doc.pop("user_id", None)
    return col_doc

@columns_router.put("/{column_id}")
async def update_column(column_id: str, column: CustomColumnUpdate):
    update_data = {k: v for k, v in column.model_dump().items() if v is not None}
    result = await db.custom_columns.update_one(
        {"_id": ObjectId(column_id), "user_id": DEFAULT_USER_ID},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Column not found")
    updated = await db.custom_columns.find_one({"_id": ObjectId(column_id)})
    updated["id"] = str(updated.pop("_id"))
    updated.pop("user_id", None)
    return updated

@columns_router.delete("/{column_id}")
async def delete_column(column_id: str):
    result = await db.custom_columns.delete_one({"_id": ObjectId(column_id), "user_id": DEFAULT_USER_ID})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Column not found")
    return {"message": "Column deleted"}

# Stats endpoint
@api_router.get("/stats")
async def get_stats():
    pipeline = [
        {"$match": {"user_id": DEFAULT_USER_ID}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.jobs.aggregate(pipeline).to_list(100)
    
    priority_pipeline = [
        {"$match": {"user_id": DEFAULT_USER_ID}},
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]
    priority_counts = await db.jobs.aggregate(priority_pipeline).to_list(100)
    
    monthly_pipeline = [
        {"$match": {"user_id": DEFAULT_USER_ID}},
        {"$addFields": {"month": {"$substr": ["$date", 0, 7]}}},
        {"$group": {"_id": "$month", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    monthly_counts = await db.jobs.aggregate(monthly_pipeline).to_list(100)
    
    total = await db.jobs.count_documents({"user_id": DEFAULT_USER_ID})
    
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
    await db.jobs.create_index([("user_id", 1), ("created_at", -1)])
    await db.custom_columns.create_index([("user_id", 1), ("name", 1)], unique=True)
    logger.info("Job Tracker API started (no-auth mode)")
        logger.info(f"Admin password updated: {admin_email}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
