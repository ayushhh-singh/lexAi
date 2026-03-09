import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./lib/config.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import researchRoutes from "./routes/research.routes.js";
import casesRoutes from "./routes/cases.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import limitationRoutes from "./routes/limitation.routes.js";

const app = express();

// Trust Railway's proxy so rate-limiter and IP headers work correctly
if (config.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.CLIENT_URL,
    credentials: true,
  })
);
app.use(
  compression({
    // Don't compress SSE streams — it buffers output and defeats streaming
    filter: (req, res) => {
      if (req.headers.accept === "text/event-stream") return false;
      return compression.filter(req, res);
    },
  })
);
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  express.json({
    limit: "10mb",
    // Preserve raw body for webhook signature verification
    verify: (req, _res, buf) => {
      if (req.url?.startsWith("/api/payments/webhook")) {
        (req as unknown as Record<string, unknown>).rawBody = buf.toString();
      }
    },
  })
);

// Health check — before rate limiter so Railway healthchecks aren't throttled
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rate limiting: 100 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/research", researchRoutes);
app.use("/api/cases", casesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/limitation", limitationRoutes);

// Global error handler
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});
