import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { type User } from "@shared/schema";
import { createProxyMiddleware } from "http-proxy-middleware";
import multer from "multer";
import { spawn } from "child_process";

// Add type definition for Express.User
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
    }
  }
}

const MemoryStoreSession = MemoryStore(session);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Proxy to Python backend (existing functionality maintained)
app.use('/api/courses/:courseId/(moodle|materials/upload)', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''  // Remove /api prefix when forwarding to Python
  }
}));


// Setup multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });
app.use('/api/courses/:courseId/upload', upload.array('files'));

// Start Python server (assuming uvicorn is installed and app.py exists in backend/python)
const pythonServer = spawn('python', ['-m', 'uvicorn', 'app:app', '--host', '0.0.0.0', '--port', '5001'], {
  cwd: 'backend/python',
  stdio: 'inherit' //Forward stdio to parent process for better logging
});


pythonServer.on('close', (code) => {
  console.log(`Python server process exited with code ${code}`);
});

// Session setup
app.use(session({
  cookie: { 
    maxAge: 86400000, // 24 hours
    secure: false, // Allow non-HTTPS in development
    sameSite: 'lax'
  },
  store: new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET || "development_secret"
}));

// Passport config
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return done(null, false, { message: "Incorrect username" });
    }
    if (user.password !== password) {
      return done(null, false, { message: "Incorrect password" });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    if (!user) {
      return done(new Error("User not found"));
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Log auth state for debugging
  console.log(`[${req.method}] ${path} - Auth:`, req.isAuthenticated());

  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Error:", err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 3000; // Changed port to avoid conflict with potential 5000 port usage by Python
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();