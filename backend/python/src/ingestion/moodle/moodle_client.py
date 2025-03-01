
import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
import requests
import bs4

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
        """
        Download course materials using direct Moodle API access.
        
        Returns:
            bool: True if successful, False otherwise.
        """
        try:
            session = requests.Session()
            
            # Login to Moodle
            login_url = f"{self.moodle_url}/login/index.php"
            response = session.get(login_url)
            
            # Parse login token
            soup = bs4.BeautifulSoup(response.text, 'html.parser')
            login_token_input = soup.find('input', {'name': 'logintoken'})
            login_token = login_token_input.get('value') if login_token_input else ""
            
            login_data = {
                "username": self.username,
                "password": self.password,
                "logintoken": login_token
            }
            
            response = session.post(login_url, data=login_data)
            
            if "login" in response.url.lower() and "success" not in response.url.lower():
                logger.error("Login to Moodle failed")
                return False
                
            # Get list of courses
            courses_url = f"{self.moodle_url}/my/"
            response = session.get(courses_url)
            
            # Extract courses (simplified implementation)
            soup = bs4.BeautifulSoup(response.text, 'html.parser')
            course_blocks = soup.find_all('div', {'class': 'course-info-container'})
            
            courses = []
            for block in course_blocks:
                course_name_elem = block.find('h4', {'class': 'course-title'})
                if course_name_elem and course_name_elem.find('a'):
                    course_link = course_name_elem.find('a').get('href')
                    course_name = course_name_elem.find('a').text.strip()
                    course_id = course_link.split('id=')[-1].split('&')[0] if 'id=' in course_link else None
                    
                    if course_id:
                        courses.append({
                            "id": course_id,
                            "name": course_name,
                            "url": course_link
                        })
                        
                        # Download course materials
                        self._download_course_materials(session, course_id, course_name)
            
            # Save courses info to file
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
            resources = soup.find_all('li', {'class': 'activity'})
            
            for resource in resources:
                try:
                    resource_link = resource.find('a')
                    if not resource_link:
                        continue
                        
                    resource_name = resource_link.text.strip()
                    resource_url = resource_link.get('href')
                    
                    # Only download documents (simplified)
                    if 'resource' in resource_url:
                        response = session.get(resource_url)
                        
                        # Check if it's a download page or direct download
                        if 'Content-Disposition' in response.headers:
                            # Direct download
                            filename = response.headers.get('Content-Disposition').split('filename=')[-1].strip('"')
                            with open(course_dir / filename, 'wb') as f:
                                f.write(response.content)
                        else:
                            # Download page, find the download link
                            soup = bs4.BeautifulSoup(response.text, 'html.parser')
                            download_link = soup.find('a', {'class': 'resourcelinkdetails'})
                            if download_link:
                                file_url = download_link.get('href')
                                filename = download_link.text.strip()
                                
                                file_response = session.get(file_url)
                                with open(course_dir / filename, 'wb') as f:
                                    f.write(file_response.content)
                                    
                        logger.info(f"Downloaded resource: {resource_name}")
                        
                except Exception as e:
                    logger.error(f"Error downloading resource {resource_name}: {e}")
                    
        except Exception as e:
            logger.error(f"Error downloading materials for course {course_name}: {e}")
    
    def get_available_courses(self) -> List[Dict[str, Any]]:
        """
        Get list of available courses.
        
        Returns:
            List[Dict[str, Any]]: List of course information dictionaries
        """
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
