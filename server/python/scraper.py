import os
import json
import logging
from typing import List, Dict, Any
import google.generativeai as genai
from bs4 import BeautifulSoup
import requests
from datetime import datetime

class MoodleScraper:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.gemini = genai.GenerativeModel('gemini-pro')

    def login(self, username: str, password: str):
        """Login to Moodle platform"""
        try:
            login_url = f"{self.base_url}/login/index.php"

            # Get login form token
            response = self.session.get(login_url)
            soup = BeautifulSoup(response.text, 'html.parser')
            token = soup.find('input', {'name': 'logintoken'})

            if token:
                token = token['value']
            else:
                raise Exception("Login token not found")

            # Perform login
            data = {
                'username': username,
                'password': password,
                'logintoken': token
            }
            response = self.session.post(login_url, data=data)

            if "loginerrors" in response.text:
                raise Exception("Login failed")

            logging.info("Successfully logged into Moodle")
        except Exception as e:
            logging.error(f"Login error: {str(e)}")
            raise Exception(f"Failed to login: {str(e)}")

    def scrape_course(self, course_id: str) -> List[Dict[str, Any]]:
        """Scrape course materials with Gemini analysis"""
        try:
            course_url = f"{self.base_url}/course/view.php?id={course_id}"
            response = self.session.get(course_url)
            soup = BeautifulSoup(response.text, 'html.parser')

            materials = []
            sections = soup.find_all('li', {'class': 'section'})

            for section in sections:
                section_name = section.find('h3', {'class': 'sectionname'})
                section_name = section_name.text if section_name else "Unnamed Section"

                # Extract content
                content_elements = section.find_all(['div', 'a'], {'class': ['activityinstance', 'modtype_resource']})

                for element in content_elements:
                    try:
                        name = element.find('span', {'class': 'instancename'})
                        name = name.text if name else "Unnamed Resource"

                        link = element.find('a')
                        url = link['href'] if link else None

                        content_type = self._determine_content_type(element)

                        # Extract text content for analysis
                        text_content = element.get_text(strip=True)

                        # Analyze with Gemini
                        analysis = self._analyze_with_gemini(text_content)

                        materials.append({
                            'section': section_name,
                            'name': name,
                            'type': content_type,
                            'url': url,
                            'content': text_content,
                            'analysis': analysis
                        })
                    except Exception as e:
                        logging.error(f"Error processing element: {str(e)}")
                        continue

            return materials

        except Exception as e:
            logging.error(f"Scraping error: {str(e)}")
            raise Exception(f"Failed to scrape course: {str(e)}")

    def _determine_content_type(self, element) -> str:
        """Determine the type of content from the element classes"""
        classes = element.get('class', [])
        if 'resource' in str(classes):
            return 'document'
        elif 'url' in str(classes):
            return 'link'
        elif 'forum' in str(classes):
            return 'forum'
        elif 'assign' in str(classes):
            return 'assignment'
        return 'other'

    def _analyze_with_gemini(self, content: str) -> str:
        """Analyze content using Gemini Pro"""
        try:
            response = self.gemini.generate_content(content)
            return response.text
        except Exception as e:
            logging.error(f"Gemini analysis error: {str(e)}")
            return ""

    def download_file(self, url: str, save_path: str) -> str:
        """Download a file from Moodle"""
        try:
            response = self.session.get(url, stream=True)
            response.raise_for_status()

            with open(save_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)

            return save_path
        except Exception as e:
            logging.error(f"File download error: {str(e)}")
            raise Exception(f"Failed to download file: {str(e)}")

    def close(self):
        """Close the session"""
        self.session.close()