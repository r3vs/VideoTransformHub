import axios from 'axios';

const PYTHON_SERVICE_URL = 'http://localhost:5001';

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/python/health`);
    return response.data.status === 'ok';
  } catch (error) {
    console.error('Python service health check failed:', error);
    return false;
  }
}

export async function scrapeMoodle(moodleUrl: string, username: string, password: string, courseId: number) {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/python/scrape-moodle`, {
      moodleUrl,
      username,
      password,
      courseId
    });
    return response.data;
  } catch (error) {
    console.error('Moodle scraping failed:', error);
    throw new Error('Failed to scrape Moodle content');
  }
}

export async function processMaterial(filePath: string, sourceType?: string) {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/python/process-material`, {
      filePath,
      sourceType
    });
    return response.data;
  } catch (error) {
    console.error('Material processing failed:', error);
    throw new Error('Failed to process material');
  }
}

export async function generateStudyPlan(courseName: string, examDate: string, studyHoursPerDay?: number) {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/python/generate-study-plan`, {
      courseName,
      examDate,
      studyHoursPerDay
    });
    return response.data;
  } catch (error) {
    console.error('Study plan generation failed:', error);
    throw new Error('Failed to generate study plan');
  }
}

export default {
  checkHealth,
  scrapeMoodle,
  processMaterial,
  generateStudyPlan
};
