import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  moodleUrl: text("moodle_url"), // Added for Moodle URL
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull(),
  type: text("type").notNull(), // video, pdf, text, folder
  content: text("content").notNull(), // file path or text content
  analysis: text("analysis"), // Gemini analysis output
  summary: text("summary"),
  sourcePath: text("source_path") // Added for source path
});

export const studyPlans = pgTable("study_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  courseId: integer("course_id").notNull(),
  title: text("title").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  completed: boolean("completed").default(false),
});

export const studyTasks = pgTable("study_tasks", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull(),
  materialId: integer("material_id").notNull(),
  dueDate: timestamp("due_date").notNull(),
  completed: boolean("completed").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCourseSchema = createInsertSchema(courses).pick({
  userId: true,
  title: true,
  description: true,
  moodleUrl: true, // Added for Moodle URL
});

export const insertMaterialSchema = createInsertSchema(materials).pick({
  courseId: true,
  type: true,
  content: true,
  sourcePath:true //added for source path
});

export const insertStudyPlanSchema = createInsertSchema(studyPlans).pick({
  userId: true,
  courseId: true,
  title: true,
  startDate: true,
  endDate: true,
});

export const insertStudyTaskSchema = createInsertSchema(studyTasks).pick({
  planId: true,
  materialId: true,
  dueDate: true,
});

// Moodle Scraping Schema (Zod)
export const moodleScrapingSchema = z.object({
  courseId: z.number(),
  moodleUrl: z.string().url(),
  username: z.string().optional(),
  password: z.string().optional(),
  autoLogin: z.boolean().default(false),
});

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type StudyPlan = typeof studyPlans.$inferSelect;
export type StudyTask = typeof studyTasks.$inferSelect;
export type MoodleScraping = z.infer<typeof moodleScrapingSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type InsertStudyPlan = z.infer<typeof insertStudyPlanSchema>;
export type InsertStudyTask = z.infer<typeof insertStudyTaskSchema>;