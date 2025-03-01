import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import passport from "passport";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { insertCourseSchema, insertMaterialSchema, insertStudyPlanSchema, insertStudyTaskSchema, insertUserSchema, moodleScrapingSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { scrapeMoodle } from "./services/moodleScraper";
import { fileURLToPath } from "url";
import { dirname } from "path";
import pythonBridge from './pythonBridge'; // Assuming this module exists and handles communication with the Python backend


// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Setup multer for file uploads
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const courseId = req.params.courseId;
    const coursePath = path.join(uploadsDir, courseId);
    if (!fs.existsSync(coursePath)) {
      fs.mkdirSync(coursePath, { recursive: true });
    }
    cb(null, coursePath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: multerStorage });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid registration data" });

    const existingUser = await storage.getUserByUsername(parsed.data.username);
    if (existingUser) return res.status(400).json({ message: "Username already taken" });

    try {
      const user = await storage.createUser(parsed.data);

      // Explicitly login after registration
      req.login(user, (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return res.status(500).json({ message: "Error logging in after registration" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session error:", err);
          return next(err);
        }
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not logged in" });
    }

    req.logout(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Course routes
  app.get("/api/courses", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const courses = await storage.getCoursesByUser(req.user.id);
    res.json(courses);
  });

  app.post("/api/courses", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = insertCourseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid course data" });

    const course = await storage.createCourse({ ...parsed.data, userId: req.user.id });
    res.json(course);
  });

  // Material routes
  app.get("/api/courses/:courseId/materials", async (req, res) => {
    const materials = await storage.getMaterialsByCourse(Number(req.params.courseId));
    res.json(materials);
  });

  app.post("/api/courses/:courseId/materials", async (req, res) => {
    const parsed = insertMaterialSchema.safeParse({
      ...req.body,
      courseId: Number(req.params.courseId)
    });
    if (!parsed.success) return res.status(400).json({ message: "Invalid material data" });

    const material = await storage.createMaterial(parsed.data);

    // Analyze with Gemini
    try {
      let content = parsed.data.content;
      if (parsed.data.type === "video" || parsed.data.type === "pdf") {
        // TODO: Extract text content from video/PDF
        content = "Extracted content here";
      }

      const result = await model.generateContent(content);
      const analysis = result.response.text();
      const summary = await model.generateContent([content, "Summarize the key points"]).then(r => r.response.text());

      await storage.updateMaterialAnalysis(material.id, analysis, summary);
    } catch (error) {
      console.error("Gemini analysis failed:", error);
    }

    res.json(material);
  });

  // Upload multiple files for a course
  app.post("/api/courses/:courseId/upload-folder", upload.array("files", 20), async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const courseId = Number(req.params.courseId);
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const materials = await storage.createMaterialsFromFolder(courseId, files);

      // Analyze uploaded materials in the background
      materials.forEach(async (material) => {
        try {
          if (!material.sourcePath) return;

          let content;
          if (material.type === "pdf") {
            // TODO: Extract text from PDF
            content = `PDF content from ${material.title}`;
          } else if (material.type === "video") {
            // TODO: Extract from video
            content = `Video content from ${material.title}`;
          } else {
            content = fs.readFileSync(material.sourcePath, 'utf8');
          }

          const result = await model.generateContent(content);
          const analysis = result.response.text();
          const summary = await model.generateContent([content, "Summarize the key points"])
            .then(r => r.response.text());

          await storage.updateMaterialAnalysis(material.id, analysis, summary);
        } catch (error) {
          console.error(`Analysis failed for material ${material.id}:`, error);
        }
      });

      res.json({ message: "Files uploaded successfully", count: files.length });
    } catch (error) {
      console.error("Folder upload error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Scrape materials from Moodle
  app.post("/api/courses/:courseId/scrape-moodle", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = moodleScrapingSchema.safeParse({
      ...req.body,
      courseId: Number(req.params.courseId)
    });

    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid Moodle scraping data" });
    }

    try {
      const scrapedMaterials = await scrapeMoodle(
        parsed.data.moodleUrl,
        parsed.data.username,
        parsed.data.password
      );

      const savedMaterials = [];
      for (const material of scrapedMaterials) {
        const newMaterial = await storage.createMaterial({
          courseId: parsed.data.courseId,
          title: material.title,
          type: material.type,
          content: material.content
        });

        // Analyze with Gemini in the background
        try {
          const result = await model.generateContent(material.content);
          const analysis = result.response.text();
          const summary = await model.generateContent([material.content, "Summarize the key points"])
            .then(r => r.response.text());

          await storage.updateMaterialAnalysis(newMaterial.id, analysis, summary);
        } catch (error) {
          console.error(`Analysis failed for scraped material ${newMaterial.id}:`, error);
        }

        savedMaterials.push(newMaterial);
      }

      res.json({
        message: "Moodle content scraped successfully",
        count: savedMaterials.length,
        materials: savedMaterials
      });
    } catch (error) {
      console.error("Moodle scraping error:", error);
      res.status(500).json({ message: "Scraping failed", error: error.message });
    }
  });

  // Study plan routes
  app.get("/api/study-plans", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });

    const plans = await storage.getStudyPlansByUser(req.user.id);
    res.json(plans);
  });

  app.post("/api/study-plans", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.status(401).json({ message: "Unauthorized" });

    const parsed = insertStudyPlanSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid study plan data" });

    const plan = await storage.createStudyPlan({ ...parsed.data, userId: req.user.id });
    res.json(plan);
  });

  app.patch("/api/study-plans/:id/complete", async (req, res) => {
    const plan = await storage.updateStudyPlanCompletion(
      Number(req.params.id),
      req.body.completed
    );
    res.json(plan);
  });

  // Study task routes
  app.get("/api/study-plans/:planId/tasks", async (req, res) => {
    const tasks = await storage.getStudyTasksByPlan(Number(req.params.planId));
    res.json(tasks);
  });

  app.post("/api/study-plans/:planId/tasks", async (req, res) => {
    const parsed = insertStudyTaskSchema.safeParse({
      ...req.body,
      planId: Number(req.params.planId)
    });
    if (!parsed.success) return res.status(400).json({ message: "Invalid study task data" });

    const task = await storage.createStudyTask(parsed.data);
    res.json(task);
  });

  app.patch("/api/study-tasks/:id/complete", async (req, res) => {
    const task = await storage.updateStudyTaskCompletion(
      Number(req.params.id),
      req.body.completed
    );
    res.json(task);
  });

  // Python Bridge routes
  app.get("/api/python-bridge/health", async (req, res) => {
    try {
      const isAvailable = await pythonBridge.checkHealth();
      res.json({ available: isAvailable });
    } catch (error) {
      console.error("Python service health check error:", error);
      res.json({ available: false, error: error.message });
    }
  });

  app.post("/api/python-bridge/scrape-moodle", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { moodleUrl, username, password, courseId } = req.body;

      if (!moodleUrl || !username || !password || !courseId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const result = await pythonBridge.scrapeMoodle(moodleUrl, username, password, courseId);

      // Save the scraped courses to the database
      if (result.courses && result.courses.length > 0) {
        // Here we would add logic to save the courses to the database
        // For now, just return the result
        console.log(`Scraped ${result.courses.length} courses from Moodle`);
      }

      res.json(result);
    } catch (error) {
      console.error("Error scraping Moodle with Python:", error);
      res.status(500).json({ message: "Failed to scrape Moodle", error: error.message });
    }
  });

  app.post("/api/python-bridge/process-material", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { filePath, sourceType } = req.body;

      if (!filePath) {
        return res.status(400).json({ message: "filePath is required" });
      }

      const result = await pythonBridge.processMaterial(filePath, sourceType);
      res.json(result);
    } catch (error) {
      console.error("Error processing material with Python:", error);
      res.status(500).json({ message: "Failed to process material", error: error.message });
    }
  });

  app.post("/api/python-bridge/generate-study-plan", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { courseName, examDate, studyHoursPerDay } = req.body;

      if (!courseName || !examDate) {
        return res.status(400).json({ message: "courseName and examDate are required" });
      }

      const result = await pythonBridge.generateStudyPlan(courseName, examDate, studyHoursPerDay);
      res.json(result);
    } catch (error) {
      console.error("Error generating study plan with Python:", error);
      res.status(500).json({ message: "Failed to generate study plan", error: error.message });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}