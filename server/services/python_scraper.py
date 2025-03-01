
#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import json
import os
import re
from datetime import datetime

class MoodleScraper:
    def __init__(self, url, username=None, password=None):
        self.url = url
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.logged_in = False
        self.course_name = ""
    
    def login(self):
        """Effettua il login su Moodle se sono fornite le credenziali"""
        if not self.username or not self.password:
            return False
            
        try:
            # Ottieni la pagina di login per estrarre token
            login_page = self.session.get(self.url)
            soup = BeautifulSoup(login_page.text, 'lxml')
            
            # Trova il form di login e token
            login_form = soup.find('form', id='login')
            if not login_form:
                print("Form di login non trovato")
                return False
                
            token_input = login_form.find('input', {'name': 'logintoken'})
            token = token_input['value'] if token_input else ''
            
            # Prepara i dati di login
            login_data = {
                'username': self.username,
                'password': self.password,
                'logintoken': token
            }
            
            # Esegui login
            login_url = self.url + '/login/index.php'
            response = self.session.post(login_url, data=login_data)
            
            # Verifica login (controllo presenza del nome utente nella pagina)
            self.logged_in = self.username.lower() in response.text.lower()
            return self.logged_in
            
        except Exception as e:
            print(f"Errore durante il login: {str(e)}")
            return False
    
    def scrape_course(self):
        """Estrae tutti i contenuti e materiali dal corso Moodle"""
        try:
            # Ottieni la pagina del corso
            response = self.session.get(self.url)
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Estrai il titolo del corso
            title_elem = soup.find('h1')
            self.course_name = title_elem.text.strip() if title_elem else "Corso sconosciuto"
            
            # Estrai le sezioni del corso
            sections = []
            section_elements = soup.find_all('li', class_='section')
            
            for section in section_elements:
                section_name_elem = section.find('h3', class_='sectionname') or section.find('div', class_='content')
                section_name = section_name_elem.text.strip() if section_name_elem else "Sezione senza nome"
                
                # Raccogli materiali didattici
                materials = []
                
                # Trova risorse (file, link, etc)
                resources = section.find_all('li', class_='activity')
                
                for res in resources:
                    # Determina il tipo di risorsa
                    resource_type = self._get_resource_type(res)
                    
                    # Ottieni titolo
                    title_elem = res.find('span', class_='instancename')
                    title = title_elem.text.strip() if title_elem else "Risorsa senza nome"
                    
                    # Ottieni link
                    link_elem = res.find('a')
                    link = link_elem['href'] if link_elem and 'href' in link_elem.attrs else None
                    
                    # Controlla se è una consegna o quiz con scadenza
                    deadline = self._get_deadline(res)
                    
                    # Aggiungi alla lista dei materiali
                    materials.append({
                        "title": title,
                        "type": resource_type,
                        "link": link,
                        "deadline": deadline,
                        "content": f"Contenuto di: {title}"  # Placeholder per il contenuto
                    })
                
                sections.append({
                    "name": section_name,
                    "materials": materials
                })
            
            return {
                "courseTitle": self.course_name,
                "sections": sections
            }
            
        except Exception as e:
            print(f"Errore durante lo scraping: {str(e)}")
            return {
                "courseTitle": self.course_name or "Errore",
                "sections": [],
                "error": str(e)
            }
    
    def _get_resource_type(self, resource_element):
        """Determina il tipo di risorsa in base alle classi CSS"""
        if not resource_element:
            return "unknown"
            
        classes = resource_element.get('class', [])
        class_str = ' '.join(classes)
        
        if 'resource' in class_str:
            # Controlla se è un PDF o altro tipo di file
            icon = resource_element.find('img', class_='activityicon')
            if icon and 'pdf' in icon.get('src', '').lower():
                return "pdf"
            return "file"
        elif 'url' in class_str:
            return "link"
        elif 'assign' in class_str:
            return "assignment"
        elif 'quiz' in class_str:
            return "quiz"
        elif 'forum' in class_str:
            return "forum"
        elif 'page' in class_str:
            return "text"
        elif 'folder' in class_str:
            return "folder"
        else:
            return "other"
    
    def _get_deadline(self, resource_element):
        """Estrae la scadenza se presente (per compiti, quiz, etc)"""
        # Cerca elementi con date
        date_elem = resource_element.find(class_=re.compile('date'))
        if date_elem:
            # Estrai il testo della data e prova a formattarlo
            date_text = date_elem.text.strip()
            try:
                # Vari pattern di data comuni su Moodle
                date_patterns = [
                    r'(\d{1,2}\s+\w+\s+\d{4})',  # 10 Gennaio 2023
                    r'(\d{1,2}/\d{1,2}/\d{4})',   # 10/01/2023
                    r'(\d{4}-\d{2}-\d{2})'        # 2023-01-10
                ]
                
                for pattern in date_patterns:
                    match = re.search(pattern, date_text)
                    if match:
                        return match.group(1)
                        
                return date_text  # Fallback: restituisci il testo originale
            except:
                return date_text
        return None

def scrape_moodle(url, username=None, password=None):
    """Funzione principale per scraping di un corso Moodle"""
    scraper = MoodleScraper(url, username, password)
    
    # Prova a fare login se fornite credenziali
    if username and password:
        if not scraper.login():
            return {"error": "Impossibile effettuare il login con le credenziali fornite"}
    
    # Scrape del corso
    result = scraper.scrape_course()
    
    # Converti il risultato in un formato compatibile con l'API
    materials = []
    
    # Appiattisci la struttura per adattarla al formato dell'API
    for section in result.get("sections", []):
        for material in section.get("materials", []):
            materials.append({
                "title": material["title"],
                "type": material["type"],
                "content": material.get("content", ""),
                "url": material.get("link", ""),
                "deadline": material.get("deadline", None),
                "section": section["name"]
            })
    
    return materials

if __name__ == "__main__":
    # Test dello scraper
    test_url = "https://elearning.example.com/course/view.php?id=123"
    results = scrape_moodle(test_url)
    print(json.dumps(results, indent=2))
