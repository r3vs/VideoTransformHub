import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { insertCourseSchema, insertMaterialSchema, insertStudyPlanSchema, insertStudyTaskSchema } from "@shared/schema";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export async function registerRoutes(app: Express): Promise<Server> {
  // Course routes
  app.get("/api/courses", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    
    const courses = await storage.getCoursesByUser(userId);
    res.json(courses);
  });

  app.post("/api/courses", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = insertCourseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid course data" });

    const course = await storage.createCourse({ ...parsed.data, userId });
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
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const plans = await storage.getStudyPlansByUser(userId);
    res.json(plans);
  });

  app.post("/api/study-plans", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = insertStudyPlanSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid study plan data" });

    const plan = await storage.createStudyPlan({ ...parsed.data, userId });
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
