
import axios from 'axios';
import { log } from '../vite';

const PYTHON_API_URL = 'http://localhost:5001/api/python';

/**
 * Service to communicate with the Python backend
 */
export const pythonBridge = {
  /**
   * Check if Python service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${PYTHON_API_URL}/health`);
      return response.data.status === 'ok';
    } catch (error) {
      log('Python service health check failed');
      return false;
    }
  },

  /**
   * Scrape Moodle for course materials
   */
  async scrapeMoodle(moodleUrl: string, username: string, password: string) {
    try {
      const response = await axios.post(`${PYTHON_API_URL}/scrape-moodle`, {
        moodleUrl,
        username,
        password
      });
      
      return response.data;
    } catch (error) {
      log(`Error scraping Moodle: ${error}`);
      throw new Error(`Failed to scrape Moodle: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Process a material file
   */
  async processMaterial(filePath: string, sourceType: string = 'moodle') {
    try {
      const response = await axios.post(`${PYTHON_API_URL}/process-material`, {
        filePath,
        sourceType
      });
      
      return response.data;
    } catch (error) {
      log(`Error processing material: ${error}`);
      throw new Error(`Failed to process material: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Generate a study plan
   */
  async generateStudyPlan(courseName: string, examDate: string, studyHoursPerDay: number = 4.0) {
    try {
      const response = await axios.post(`${PYTHON_API_URL}/generate-study-plan`, {
        courseName,
        examDate,
        studyHoursPerDay
      });
      
      return response.data;
    } catch (error) {
      log(`Error generating study plan: ${error}`);
      throw new Error(`Failed to generate study plan: ${error.response?.data?.message || error.message}`);
    }
  }
};
