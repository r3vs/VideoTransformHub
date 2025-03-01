
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
import json
from datetime import datetime
import logging

# Configura logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Importa il MoodleScraper
from scraper import MoodleScraper

app = FastAPI()

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/moodle-scrape")
async def scrape_moodle_course(
    moodle_url: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    course_id: str = Form(...)
):
    """
    Scrape course materials from Moodle platform
    """
    try:
        logger.info(f"Starting Moodle scraping for course {course_id} at {moodle_url}")
        scraper = MoodleScraper(moodle_url)
        scraper.login(username, password)
        materials = scraper.scrape_course(course_id)
        logger.info(f"Scraped {len(materials)} materials from Moodle")
        return {"status": "success", "materials": materials}
    except Exception as e:
        logger.error(f"Error during Moodle scraping: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/upload-materials")
async def upload_materials(
    course_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Upload course materials directly
    """
    try:
        logger.info(f"Uploading {len(files)} files for course {course_id}")
        uploaded_files = []
        
        # Ensure directory exists
        upload_dir = f"uploads/course_{course_id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            # Save file
            file_path = os.path.join(upload_dir, file.filename)
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            uploaded_files.append({
                "name": file.filename,
                "path": file_path,
                "type": _determine_file_type(file.filename)
            })
            
        return {"status": "success", "materials": uploaded_files}
    except Exception as e:
        logger.error(f"Error uploading files: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

def _determine_file_type(filename):
    """Determine the file type based on extension"""
    ext = filename.lower().split('.')[-1]
    if ext in ['pdf']:
        return 'document'
    elif ext in ['mp4', 'avi', 'mov', 'mkv']:
        return 'video'
    elif ext in ['jpg', 'jpeg', 'png', 'gif']:
        return 'image'
    elif ext in ['ppt', 'pptx']:
        return 'presentation'
    elif ext in ['doc', 'docx']:
        return 'document'
    return 'other'

@app.get("/health")
async def health_check():
    return {"status": "up"}

if __name__ == "__main__":
    import uvicorn
    # Using a different port from the Node.js server
    uvicorn.run(app, host="0.0.0.0", port=5001)
