
import puppeteer from 'puppeteer';
import axios from 'axios';
import cheerio from 'cheerio';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function scrapeMoodle(moodleUrl: string, username?: string, password?: string) {
  try {
    // Start a browser instance
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(moodleUrl, { waitUntil: 'networkidle2' });
    
    // If credentials are provided, attempt login
    if (username && password) {
      await page.type('input[name="username"]', username);
      await page.type('input[name="password"]', password);
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
    }
    
    // Extract course materials
    const courseContent = await page.evaluate(() => {
      return document.body.innerHTML;
    });
    
    await browser.close();
    
    // Parse with Cheerio
    const $ = cheerio.load(courseContent);
    
    const materials = [];
    
    // Extract links to resources
    $('a[href*="resource"]').each((_, element) => {
      const title = $(element).text().trim();
      const url = $(element).attr('href');
      
      if (title && url) {
        materials.push({
          title,
          type: url.includes('.pdf') ? 'pdf' : 'url',
          content: url
        });
      }
    });
    
    // Extract text content from sections
    $('.section').each((_, element) => {
      const sectionTitle = $(element).find('.sectionname').text().trim();
      const content = $(element).find('.content').text().trim();
      
      if (sectionTitle && content) {
        materials.push({
          title: sectionTitle,
          type: 'text',
          content
        });
      }
    });
    
    // If no materials found, use Gemini to extract with more advanced techniques
    if (materials.length === 0) {
      const analysisPrompt = `Extract a list of learning materials from this HTML content from a Moodle page. Format the response as JSON with title, type (text, pdf, video, url), and content fields:\n\n${courseContent.substring(0, 10000)}`;
      
      try {
        const result = await model.generateContent(analysisPrompt);
        const analysisText = result.response.text();
        
        // Try to parse JSON from the response
        try {
          const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                           analysisText.match(/\[\s*\{\s*"title"/);
          
          if (jsonMatch) {
            const jsonContent = jsonMatch[1] || jsonMatch[0];
            const extractedMaterials = JSON.parse(jsonContent);
            materials.push(...extractedMaterials);
          }
        } catch (parseError) {
          console.error('Error parsing Gemini JSON response:', parseError);
        }
      } catch (geminiError) {
        console.error('Gemini analysis failed:', geminiError);
      }
    }
    
    return materials;
  } catch (error) {
    console.error('Moodle scraping error:', error);
    
    // Fallback to OmniTools with Gemini 2 Pro
    try {
      // We'll simulate this by directly analyzing the URL
      const response = await axios.get(moodleUrl);
      const htmlContent = response.data;
      
      const analysisPrompt = `You are OmniTools with Gemini 2 Pro. Extract all learning materials from this Moodle page. Format as JSON array with objects containing title, type (text, pdf, video, url), and content fields:\n\n${htmlContent.substring(0, 15000)}`;
      
      const result = await model.generateContent(analysisPrompt);
      const analysisText = result.response.text();
      
      // Try to parse JSON from the response
      try {
        const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                         analysisText.match(/\[\s*\{\s*"title"/);
        
        if (jsonMatch) {
          const jsonContent = jsonMatch[1] || jsonMatch[0];
          return JSON.parse(jsonContent);
        }
      } catch (parseError) {
        console.error('Error parsing fallback Gemini JSON response:', parseError);
      }
      
      // If parsing fails, return a basic structure
      return [{
        title: "Extracted Moodle Content",
        type: "text",
        content: analysisText
      }];
    } catch (fallbackError) {
      console.error('Fallback extraction failed:', fallbackError);
      throw new Error('All scraping methods failed');
    }
  }
}
