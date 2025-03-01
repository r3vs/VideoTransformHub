import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { log } from '../vite';

export async function scrapeMoodle(url: string) {
  log('Starting Moodle scraping process', 'moodle-scraper');

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const content = await page.content();
    const $ = cheerio.load(content);

    // Extract course information
    const courseTitle = $('.page-header-headings h1').text().trim();

    // Extract course materials
    const materials = [];
    $('.activityinstance').each((i, el) => {
      const title = $(el).find('span.instancename').text().trim();
      const type = determineResourceType($(el));
      const link = $(el).find('a').attr('href') || '';

      materials.push({
        title,
        type,
        link
      });
    });

    await browser.close();

    return {
      courseTitle,
      materials
    };
  } catch (error) {
    log(`Error scraping Moodle: ${error}`, 'moodle-scraper');
    throw error;
  }
}

function determineResourceType(element: cheerio.Cheerio) {
  const classes = element.find('img').attr('class') || '';

  if (classes.includes('activityicon')) {
    const src = element.find('img').attr('src') || '';

    if (src.includes('pdf')) return 'pdf';
    if (src.includes('video')) return 'video';
    if (src.includes('folder')) return 'folder';
    if (src.includes('url')) return 'url';
    if (src.includes('page')) return 'page';
  }

  return 'other';
}