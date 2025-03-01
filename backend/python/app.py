from flask import Flask, request, jsonify
import os
import logging
import sys
from pathlib import Path
import json
from datetime import datetime

# Add src to path for imports
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from src.config.config import settings
from src.ingestion.moodle.moodle_client import MoodleClient
from src.processing.content_processor import ContentProcessor
from src.planner.study_planner import StudyPlanner

app = Flask(__name__)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.route('/api/python/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "service": "python-backend"})

@app.route('/api/python/scrape-moodle', methods=['POST'])
def scrape_moodle():
    """Scrape materials from Moodle course."""
    data = request.json
    try:
        # Override settings with request data
        if 'moodleUrl' in data:
            settings.MOODLE_URL = data['moodleUrl']
        if 'username' in data:
            settings.MOODLE_USERNAME = data['username']
        if 'password' in data:
            settings.MOODLE_PASSWORD = data['password']

        moodle_client = MoodleClient()
        success = moodle_client.download_course_materials()

        if success:
            courses = moodle_client.get_available_courses()

            # Log results
            logger.info(f"Successfully scraped {len(courses)} courses")
            for course in courses:
                logger.info(f"Course: {course['name']}")
                logger.info(f"- Materials: {len(course.get('materials', []))}")
                logger.info(f"- Deadlines: {len(course.get('deadlines', []))}")

            return jsonify({
                "status": "success",
                "message": f"Downloaded materials from {len(courses)} courses",
                "courses": courses
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Failed to download course materials"
            }), 400

    except Exception as e:
        logger.error(f"Error scraping Moodle: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/python/process-material', methods=['POST'])
def process_material():
    """Process a learning material file."""
    data = request.json
    try:
        processor = ContentProcessor()
        file_path = data.get('filePath')
        source_type = data.get('sourceType', 'moodle')

        if not file_path:
            return jsonify({"status": "error", "message": "filePath is required"}), 400

        file_path = Path(file_path)

        if not file_path.exists():
            return jsonify({"status": "error", "message": f"File not found: {file_path}"}), 404

        # Process content based on file type
        content = processor.process_file(file_path, source_type)

        # Generate study notes
        notes_path = processor.generate_notes(content)

        return jsonify({
            "status": "success",
            "message": f"Processed {file_path}",
            "notesPath": str(notes_path),
            "content": content
        })

    except Exception as e:
        logger.error(f"Error processing material: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/python/generate-study-plan', methods=['POST'])
def generate_study_plan():
    """Generate a personalized study plan."""
    data = request.json
    try:
        course_name = data.get('courseName')
        exam_date_str = data.get('examDate')

        if not course_name or not exam_date_str:
            return jsonify({
                "status": "error", 
                "message": "courseName and examDate are required"
            }), 400

        # Parse exam date
        exam_date = datetime.fromisoformat(exam_date_str)

        # Create study plan
        planner = StudyPlanner()
        study_plan = planner.create_study_plan(
            course_name=course_name,
            exam_date=exam_date,
            study_hours_per_day=data.get('studyHoursPerDay', 4.0)
        )

        # Save study plan
        plan_path = planner.save_study_plan(study_plan)

        return jsonify({
            "status": "success",
            "planPath": str(plan_path),
            "studyPlan": study_plan
        })

    except Exception as e:
        logger.error(f"Error generating study plan: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)