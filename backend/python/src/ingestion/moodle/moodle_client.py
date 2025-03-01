import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
import requests
import bs4
from datetime import datetime

from src.config.config import settings

logger = logging.getLogger(__name__)

class MoodleClient:
    """Client for interacting with Moodle to download course materials."""

    def __init__(self):
        self.moodle_url = settings.MOODLE_URL
        self.username = settings.MOODLE_USERNAME
        self.password = settings.MOODLE_PASSWORD
        self.download_dir = Path(settings.OUTPUT_PATH) / "moodle"
        self._ensure_dirs()

    def _ensure_dirs(self):
        """Ensure necessary directories exist."""
        self.download_dir.mkdir(parents=True, exist_ok=True)

    def download_course_materials(self) -> bool:
        """Download course materials using direct Moodle API access."""
        try:
            session = requests.Session()

            # Login to Moodle
            login_url = f"{self.moodle_url}/login/index.php"
            response = session.get(login_url)

            # Parse login token
            soup = bs4.BeautifulSoup(response.text, 'html.parser')
            login_token = soup.find('input', {'name': 'logintoken'})['value']

            login_data = {
                "username": self.username,
                "password": self.password,
                "logintoken": login_token
            }

            response = session.post(login_url, data=login_data)

            if "login" in response.url.lower() and "success" not in response.url.lower():
                logger.error("Login to Moodle failed")
                return False

            # Get course page
            courses_url = f"{self.moodle_url}/my/"
            response = session.get(courses_url)

            # Extract courses and materials
            soup = bs4.BeautifulSoup(response.text, 'html.parser')
            course_blocks = soup.find_all('div', {'class': 'course-info-container'})

            courses = []
            for block in course_blocks:
                course_name_elem = block.find('h4', {'class': 'course-title'})
                if course_name_elem and course_name_elem.find('a'):
                    course_link = course_name_elem.find('a')['href']
                    course_name = course_name_elem.find('a').text.strip()
                    course_id = course_link.split('id=')[-1].split('&')[0] if 'id=' in course_link else None

                    if course_id:
                        course_info = {
                            "id": course_id,
                            "name": course_name,
                            "url": course_link,
                            "materials": [],
                            "deadlines": []
                        }

                        # Download course materials
                        materials, deadlines = self._download_course_materials(session, course_id, course_name)
                        course_info["materials"] = materials
                        course_info["deadlines"] = deadlines
                        courses.append(course_info)

            # Save courses info
            with open(self.download_dir / "courses.json", 'w') as f:
                json.dump(courses, f, indent=2)

            logger.info(f"Downloaded materials for {len(courses)} courses")
            return True

        except Exception as e:
            logger.error(f"Error downloading Moodle materials: {e}")
            return False

    def _download_course_materials(self, session, course_id, course_name):
        """Download materials for a specific course."""
        try:
            course_url = f"{self.moodle_url}/course/view.php?id={course_id}"
            response = session.get(course_url)

            # Create course directory
            course_dir = self.download_dir / f"course_{course_id}_{course_name.replace(' ', '_')}"
            course_dir.mkdir(exist_ok=True)

            # Save course page for analysis
            with open(course_dir / "course_page.html", 'w', encoding='utf-8') as f:
                f.write(response.text)

            # Parse resources and activities
            soup = bs4.BeautifulSoup(response.text, 'html.parser')
            materials = []
            deadlines = []

            # Find all activities and resources
            resources = soup.find_all('li', {'class': 'activity'})

            for resource in resources:
                try:
                    resource_link = resource.find('a')
                    if not resource_link:
                        continue

                    resource_name = resource_link.text.strip()
                    resource_url = resource_link['href']

                    # Detect resource type
                    resource_type = self._detect_resource_type(resource)

                    # Handle different resource types
                    if resource_type == "document":
                        response = session.get(resource_url)
                        filename = self._get_filename_from_response(response)
                        if filename:
                            filepath = course_dir / filename
                            with open(filepath, 'wb') as f:
                                f.write(response.content)
                            materials.append({
                                "type": "document",
                                "name": resource_name,
                                "file": str(filepath),
                                "url": resource_url
                            })

                    elif resource_type == "quiz":
                        # Extract quiz deadline if available
                        deadline = self._extract_deadline(resource)
                        if deadline:
                            deadlines.append({
                                "type": "quiz",
                                "name": resource_name,
                                "deadline": deadline,
                                "url": resource_url
                            })

                    elif resource_type == "assignment":
                        # Extract assignment deadline
                        deadline = self._extract_deadline(resource)
                        if deadline:
                            deadlines.append({
                                "type": "assignment",
                                "name": resource_name,
                                "deadline": deadline,
                                "url": resource_url
                            })

                    elif resource_type == "link":
                        materials.append({
                            "type": "link",
                            "name": resource_name,
                            "url": resource_url
                        })

                except Exception as e:
                    logger.error(f"Error downloading resource {resource_name}: {e}")

            return materials, deadlines

        except Exception as e:
            logger.error(f"Error downloading materials for course {course_name}: {e}")
            return [], []

    def _detect_resource_type(self, resource_elem):
        """Detect type of Moodle resource from its HTML element."""
        classes = resource_elem.get('class', [])

        if 'resource' in classes:
            return "document"
        elif 'quiz' in classes:
            return "quiz"
        elif 'assign' in classes:
            return "assignment"
        elif 'url' in classes:
            return "link"
        return "other"

    def _extract_deadline(self, elem):
        """Extract deadline date from quiz or assignment element."""
        try:
            deadline_elem = elem.find('div', {'class': 'info'})
            if deadline_elem and 'due' in deadline_elem.text.lower():
                # Parse the date text, assuming format like "Due: March 15, 2024 11:59 PM"
                date_text = deadline_elem.text.split('Due:')[-1].strip()
                return datetime.strptime(date_text, "%B %d, %Y %I:%M %p").isoformat()
        except Exception as e:
            logger.error(f"Error extracting deadline: {e}")
        return None

    def _get_filename_from_response(self, response):
        """Extract filename from response headers or URL."""
        if 'Content-Disposition' in response.headers:
            return response.headers['Content-Disposition'].split('filename=')[-1].strip('"')
        return response.url.split('/')[-1]

    def get_available_courses(self) -> List[Dict[str, Any]]:
        """Get list of available courses."""
        courses_file = self.download_dir / "courses.json"

        if not courses_file.exists():
            logger.warning("Courses file not found. Run download_course_materials first.")
            return []

        try:
            with open(courses_file, 'r') as f:
                courses = json.load(f)
            return courses
        except Exception as e:
            logger.error(f"Error reading courses file: {e}")
            return []