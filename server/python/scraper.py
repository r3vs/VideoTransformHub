import aiohttp
from bs4 import BeautifulSoup
import google.generativeai as genai
from typing import List, Dict, Any
import os
import json
import logging

class MoodleScraper:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = aiohttp.ClientSession()
        self.gemini = genai.GenerativeModel('gemini-pro')
        
    async def login(self, username: str, password: str):
        """Login to Moodle platform"""
        try:
            login_url = f"{self.base_url}/login/index.php"
            # Get login form token
            async with self.session.get(login_url) as response:
                text = await response.text()
                soup = BeautifulSoup(text, 'html.parser')
                token = soup.find('input', {'name': 'logintoken'})['value']
            
            # Login
            data = {
                'username': username,
                'password': password,
                'logintoken': token
            }
            async with self.session.post(login_url, data=data) as response:
                if "loginerrors" in await response.text():
                    raise Exception("Login failed")
                
        except Exception as e:
            logging.error(f"Login error: {str(e)}")
            raise Exception(f"Failed to login: {str(e)}")

    async def scrape_course(self) -> List[Dict[str, Any]]:
        """Scrape course materials using Moodle-ML with Gemini fallback"""
        try:
            # First try with Moodle-ML
            materials = await self._scrape_with_moodleml()
            if not materials:
                # Fallback to basic scraping + Gemini
                materials = await self._scrape_with_gemini()
            return materials
        except Exception as e:
            logging.error(f"Scraping error: {str(e)}")
            raise Exception(f"Failed to scrape course: {str(e)}")

    async def _scrape_with_moodleml(self) -> List[Dict[str, Any]]:
        """Attempt to scrape using Moodle-ML"""
        try:
            # TODO: Implement Moodle-ML integration
            return []
        except Exception:
            return []

    async def _scrape_with_gemini(self) -> List[Dict[str, Any]]:
        """Fallback scraping method using basic scraping + Gemini"""
        materials = []
        
        # Get course page content
        async with self.session.get(self.base_url) as response:
            content = await response.text()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Extract course sections
            sections = soup.find_all('li', {'class': 'section'})
            
            for section in sections:
                # Use Gemini to analyze section content
                section_text = section.get_text()
                analysis = await self._analyze_with_gemini(section_text)
                
                # Extract resources and activities
                resources = section.find_all(['a', 'div'], {'class': ['resource', 'activity']})
                
                for resource in resources:
                    materials.append({
                        'type': self._get_resource_type(resource),
                        'name': resource.get_text(strip=True),
                        'url': resource.get('href', ''),
                        'analysis': analysis
                    })
                    
        return materials

    async def _analyze_with_gemini(self, content: str) -> str:
        """Analyze content using Gemini Pro"""
        try:
            response = await self.gemini.generate_content(content)
            return response.text
        except Exception as e:
            logging.error(f"Gemini analysis error: {str(e)}")
            return ""

    def _get_resource_type(self, resource) -> str:
        """Determine resource type from HTML classes"""
        classes = resource.get('class', [])
        if 'resource' in classes:
            return 'document'
        elif 'url' in classes:
            return 'link'
        elif 'forum' in classes:
            return 'forum'
        elif 'assign' in classes:
            return 'assignment'
        return 'other'

    async def close(self):
        """Close the session"""
        await self.session.close()
