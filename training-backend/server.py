# CR-053: Training Backend — FastAPI main server
from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'mygenie_training')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Create FastAPI app
app = FastAPI(title="MyGenie Training Academy API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routes.catalog import router as catalog_router
from routes.progress import router as progress_router
from routes.manager import router as manager_router

app.include_router(catalog_router)
app.include_router(progress_router)
app.include_router(manager_router)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    # Create indexes
    await db.training_progress.create_index([("restaurant_id", 1), ("employee_id", 1)])
    await db.training_progress.create_index([("restaurant_id", 1), ("employee_id", 1), ("course_id", 1)])
    await db.training_progress.create_index([("restaurant_id", 1), ("course_id", 1), ("status", 1)])
    await db.training_activity_log.create_index([("restaurant_id", 1), ("employee_id", 1), ("timestamp", -1)])
    await db.training_courses.create_index([("course_id", 1)], unique=True)
    await db.training_missions.create_index([("mission_id", 1)], unique=True)
    await db.training_missions.create_index([("course_id", 1), ("display_order", 1)])
    await db.training_restaurant_config.create_index([("restaurant_id", 1)], unique=True)
    logger.info("Training backend indexes created")


@app.on_event("shutdown")
async def shutdown():
    client.close()
