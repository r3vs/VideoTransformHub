from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os
import json
from datetime import datetime

from .auth import get_current_user, User
from .scraper import MoodleScraper
from .storage import save_course_materials

app = FastAPI()

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/courses/{course_id}/moodle")
async def scrape_moodle_course(
    course_id: int,
    moodle_url: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """
    Scrape course materials from Moodle platform
    """
    try:
        scraper = MoodleScraper(moodle_url)
        await scraper.login(username, password)
        materials = await scraper.scrape_course()
        
        # Save scraped materials
        saved_materials = await save_course_materials(course_id, materials)
        return {"status": "success", "materials": saved_materials}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/courses/{course_id}/materials/upload")
async def upload_materials(
    course_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload course materials directly
    """
    try:
        uploaded_files = []
        for file in files:
            # Save file and create material entry
            material = await save_course_materials(
                course_id,
                [{
                    "type": "file",
                    "name": file.filename,
                    "content": await file.read()
                }]
            )
            uploaded_files.extend(material)
            
        return {"status": "success", "materials": uploaded_files}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
