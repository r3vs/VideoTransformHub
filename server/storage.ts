import {
  users, courses, materials, studyPlans, studyTasks,
  type User, type Course, type Material, type StudyPlan, type StudyTask,
  type InsertUser, type InsertCourse, type InsertMaterial, type InsertStudyPlan, type InsertStudyTask
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Courses
  getCourse(id: number): Promise<Course | undefined>;
  getCoursesByUser(userId: number): Promise<Course[]>;
  createCourse(course: InsertCourse & { userId: number }): Promise<Course>;
  getCourseById(courseId: number): Promise<Course | null>; // Added function

  // Materials
  getMaterial(id: number): Promise<Material | undefined>;
  getMaterialsByCourse(courseId: number): Promise<Material[]>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterialAnalysis(id: number, analysis: string, summary: string): Promise<Material>;

  // Study Plans
  getStudyPlan(id: number): Promise<StudyPlan | undefined>;
  getStudyPlansByUser(userId: number): Promise<StudyPlan[]>;
  createStudyPlan(plan: InsertStudyPlan & { userId: number }): Promise<StudyPlan>;
  updateStudyPlanCompletion(id: number, completed: boolean): Promise<StudyPlan>;

  // Study Tasks
  getStudyTask(id: number): Promise<StudyTask | undefined>;
  getStudyTasksByPlan(planId: number): Promise<StudyTask[]>;
  createStudyTask(task: InsertStudyTask): Promise<StudyTask>;
  updateStudyTaskCompletion(id: number, completed: boolean): Promise<StudyTask>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private courses: Map<number, Course>;
  private materials: Map<number, Material>;
  private studyPlans: Map<number, StudyPlan>;
  private studyTasks: Map<number, StudyTask>;
  private currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.courses = new Map();
    this.materials = new Map();
    this.studyPlans = new Map();
    this.studyTasks = new Map();
    this.currentId = {
      users: 1,
      courses: 1,
      materials: 1,
      studyPlans: 1,
      studyTasks: 1
    };
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Courses
  async getCourse(id: number): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async getCoursesByUser(userId: number): Promise<Course[]> {
    return Array.from(this.courses.values()).filter(
      (course) => course.userId === userId
    );
  }

  async createCourse(course: InsertCourse & { userId: number }): Promise<Course> {
    const id = this.currentId.courses++;
    const newCourse: Course = { ...course, id };
    this.courses.set(id, newCourse);
    return newCourse;
  }

  async getCourseById(courseId: number): Promise<Course | null> { // Added function implementation
    const course = this.courses.get(courseId);
    return course || null;
  }

  // Materials
  async getMaterial(id: number): Promise<Material | undefined> {
    return this.materials.get(id);
  }

  async getMaterialsByCourse(courseId: number): Promise<Material[]> {
    return Array.from(this.materials.values()).filter(
      (material) => material.courseId === courseId
    );
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const id = this.currentId.materials++;
    const newMaterial: Material = { ...material, id, analysis: null, summary: null };
    this.materials.set(id, newMaterial);
    return newMaterial;
  }

  async updateMaterialAnalysis(id: number, analysis: string, summary: string): Promise<Material> {
    const material = this.materials.get(id);
    if (!material) throw new Error("Material not found");
    const updated = { ...material, analysis, summary };
    this.materials.set(id, updated);
    return updated;
  }

  // Study Plans
  async getStudyPlan(id: number): Promise<StudyPlan | undefined> {
    return this.studyPlans.get(id);
  }

  async getStudyPlansByUser(userId: number): Promise<StudyPlan[]> {
    return Array.from(this.studyPlans.values()).filter(
      (plan) => plan.userId === userId
    );
  }

  async createStudyPlan(plan: InsertStudyPlan & { userId: number }): Promise<StudyPlan> {
    const id = this.currentId.studyPlans++;
    const newPlan: StudyPlan = { ...plan, id, completed: false };
    this.studyPlans.set(id, newPlan);
    return newPlan;
  }

  async updateStudyPlanCompletion(id: number, completed: boolean): Promise<StudyPlan> {
    const plan = this.studyPlans.get(id);
    if (!plan) throw new Error("Study plan not found");
    const updated = { ...plan, completed };
    this.studyPlans.set(id, updated);
    return updated;
  }

  // Study Tasks
  async getStudyTask(id: number): Promise<StudyTask | undefined> {
    return this.studyTasks.get(id);
  }

  async getStudyTasksByPlan(planId: number): Promise<StudyTask[]> {
    return Array.from(this.studyTasks.values()).filter(
      (task) => task.planId === planId
    );
  }

  async createStudyTask(task: InsertStudyTask): Promise<StudyTask> {
    const id = this.currentId.studyTasks++;
    const newTask: StudyTask = { ...task, id, completed: false };
    this.studyTasks.set(id, newTask);
    return newTask;
  }

  async updateStudyTaskCompletion(id: number, completed: boolean): Promise<StudyTask> {
    const task = this.studyTasks.get(id);
    if (!task) throw new Error("Study task not found");
    const updated = { ...task, completed };
    this.studyTasks.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();