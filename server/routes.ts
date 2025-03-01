import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import passport from "passport";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { insertCourseSchema, insertMaterialSchema, insertStudyPlanSchema, insertStudyTaskSchema, insertUserSchema } from "@shared/schema";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

  const httpServer = createServer(app);
  return httpServer;
}