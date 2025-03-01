
import sys
import json
import requests
from bs4 import BeautifulSoup
import logging

# Configurazione logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def scrape_moodle(url, username=None, password=None):
    """
    Funzione principale per lo scraping di Moodle
    """
    logger.info(f"Avvio scraping di: {url}")
    
    try:
        # Prima prova: accesso diretto (pagina pubblica)
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return parse_moodle_content(response.content, url)
            
        # Se serve autenticazione
        if username and password:
            logger.info("Tentativo di login su Moodle")
            session = requests.Session()
            
            # Trova la pagina di login
            login_url = find_login_url(url)
            if not login_url:
                login_url = f"{'/'.join(url.split('/')[:3])}/login/index.php"
            
            # Simula login (da adattare in base alla struttura di Moodle)
            login_data = {
                'username': username,
                'password': password,
            }
            
            login_response = session.post(login_url, data=login_data)
            if login_response.status_code == 200:
                course_response = session.get(url)
                return parse_moodle_content(course_response.content, url)
        
        logger.error(f"Impossibile accedere a: {url}")
        return {"error": "Accesso non riuscito", "materials": []}
        
    except Exception as e:
        logger.error(f"Errore durante lo scraping: {str(e)}")
        return {"error": str(e), "materials": []}

def find_login_url(url):
    """Trova l'URL di login dal sito Moodle"""
    try:
        base_url = '/'.join(url.split('/')[:3])
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Cerca link al login
        login_links = soup.find_all('a', href=True)
        for link in login_links:
            if 'login' in link['href'].lower():
                if link['href'].startswith('http'):
                    return link['href']
                else:
                    return f"{base_url}{link['href']}"
    except:
        pass
    return None

def parse_moodle_content(html_content, url):
    """Analizza il contenuto HTML di Moodle per estrarre materiali"""
    soup = BeautifulSoup(html_content, 'html.parser')
    base_url = '/'.join(url.split('/')[:3])
    
    # Estrai titolo del corso
    course_title = ""
    title_elem = soup.select_one('.page-header-headings h1, .course-header-title')
    if title_elem:
        course_title = title_elem.text.strip()
    
    # Estrai materiali del corso
    materials = []
    
    # Cerca attività e risorse
    for item in soup.select('.activityinstance, .modtype_resource, .modtype_folder, .modtype_url'):
        title_elem = item.select_one('.instancename, .displayname')
        link_elem = item.select_one('a')
        
        if not title_elem or not link_elem:
            continue
            
        title = title_elem.text.strip()
        link = link_elem.get('href', '')
        if link and not link.startswith('http'):
            link = f"{base_url}{link}"
            
        # Determina il tipo di risorsa
        resource_type = "altro"
        if '.pdf' in link.lower():
            resource_type = "pdf"
        elif any(ext in link.lower() for ext in ['.mp4', '.avi', '.mov', '.webm']):
            resource_type = "video"
        elif 'folder' in link.lower() or 'directory' in link.lower():
            resource_type = "folder"
        elif 'url' in link.lower() or 'link' in link.lower():
            resource_type = "url"
            
        materials.append({
            "title": title,
            "type": resource_type,
            "link": link,
            "content": f"Contenuto del materiale: {title}"  # Placeholder per il contenuto
        })
    
    return {
        "courseTitle": course_title,
        "materials": materials
    }

if __name__ == "__main__":
    # Lettura degli argomenti da riga di comando
    if len(sys.argv) < 2:
        print(json.dumps({"error": "URL mancante"}))
        sys.exit(1)
        
    url = sys.argv[1]
    username = sys.argv[2] if len(sys.argv) > 2 else None
    password = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Esegui lo scraping e restituisci il risultato in formato JSON
    result = scrape_moodle(url, username, password)
    print(json.dumps(result))
