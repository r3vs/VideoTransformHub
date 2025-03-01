
import { spawn } from 'child_process';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { log } from '../vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Ottieni il percorso corrente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pythonScriptPath = path.join(__dirname, 'python_scraper.py');

export async function scrapeMoodle(url: string, username: string = '', password: string = '') {
  log('Starting Moodle scraping process', 'moodle-scraper');

  try {
    // Tenta prima con lo script Python
    log('Trying Python scraper first', 'moodle-scraper');
    const result = await runPythonScraper(url, username, password);
    
    if (result && result.materials && result.materials.length > 0) {
      log(`Python scraper successful: Found ${result.materials.length} materials`, 'moodle-scraper');
      return result.materials.map(item => ({
        title: item.title,
        type: item.type,
        link: item.link,
        content: item.content
      }));
    }
    
    // Fallback a Puppeteer se Python non trova risultati
    log('Falling back to Puppeteer scraper', 'moodle-scraper');
    return await puppeteerScraper(url, username, password);
  } catch (error) {
    log(`Error during scraping: ${error}`, 'moodle-scraper');
    
    // Ultimo tentativo con Puppeteer
    try {
      log('Last attempt with Puppeteer', 'moodle-scraper');
      return await puppeteerScraper(url, username, password);
    } catch (fallbackError) {
      log(`All scraping methods failed: ${fallbackError}`, 'moodle-scraper');
      throw new Error(`Failed to scrape Moodle content: ${error.message}`);
    }
  }
}

async function runPythonScraper(url: string, username: string = '', password: string = '') {
  return new Promise((resolve, reject) => {
    const args = [pythonScriptPath, url];
    
    if (username) args.push(username);
    if (password) args.push(password);
    
    const pythonProcess = spawn('python3', args);
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      log(`Python scraper error: ${data.toString()}`, 'moodle-scraper');
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        log(`Python script exited with code ${code}: ${errorData}`, 'moodle-scraper');
        return reject(new Error(`Python scraper failed: ${errorData}`));
      }
      
      try {
        const result = JSON.parse(outputData);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error.message}`));
      }
    });
  });
}

async function puppeteerScraper(url: string, username: string = '', password: string = '') {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Gestione login se necessario
    if (username && password) {
      log('Attempting login with Puppeteer', 'moodle-scraper');
      // Controllo se siamo in una pagina di login
      const loginForm = await page.$('form#login, form.loginform, form[action*="login"]');
      
      if (loginForm) {
        // Compila form di login
        await page.type('input[name="username"]', username);
        await page.type('input[name="password"]', password);
        await Promise.all([
          page.click('input[type="submit"], button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle2' })
        ]);
      }
    }

    const content = await page.content();
    const $ = cheerio.load(content);

    // Estrai materiali del corso
    const materials = [];
    $('.activityinstance, .modtype_resource, .activity').each((i, el) => {
      const title = $(el).find('span.instancename, .activityname').text().trim();
      const type = determineResourceType($(el));
      const link = $(el).find('a').attr('href') || '';

      materials.push({
        title,
        type,
        link,
        content: `Content for ${title}`
      });
    });

    return materials;
  } finally {
    await browser.close();
  }
}

function determineResourceType(element: cheerio.Cheerio) {
  const classes = element.find('img').attr('class') || '';
  const src = element.find('img').attr('src') || '';
  const href = element.find('a').attr('href') || '';

  if (href.includes('.pdf')) return 'pdf';
  if (href.includes('.mp4') || href.includes('.webm')) return 'video';
  
  if (classes.includes('activityicon')) {
    if (src.includes('pdf')) return 'pdf';
    if (src.includes('video')) return 'video';
    if (src.includes('folder')) return 'folder';
    if (src.includes('url')) return 'url';
    if (src.includes('page')) return 'page';
  }

  return 'other';
}
