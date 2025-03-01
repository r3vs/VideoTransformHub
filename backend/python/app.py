
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import shutil

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create storage directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Python backend is running"}

@app.post("/courses/{course_id}/materials/upload")
async def upload_materials(
    course_id: int,
    files: List[UploadFile] = File(...),
):
    try:
        results = []
        for file in files:
            # Save the file
            file_path = f"uploads/{file.filename}"
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            results.append({
                "filename": file.filename,
                "size": os.path.getsize(file_path),
                "status": "success"
            })
        
        return {"uploads": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/courses/{course_id}/moodle")
async def scrape_moodle(course_id: int, url: str):
    # In a real implementation, this would scrape a Moodle page
    # For now, return sample data
    return {
        "course_id": course_id,
        "url": url,
        "materials": [
            {"title": "Lecture 1", "type": "pdf", "url": "https://example.com/lecture1.pdf"},
            {"title": "Lecture 2", "type": "pdf", "url": "https://example.com/lecture2.pdf"},
            {"title": "Assignment 1", "type": "doc", "url": "https://example.com/assignment1.doc"}
        ]
    }
