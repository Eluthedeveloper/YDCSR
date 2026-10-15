import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { swaggerSpec } from './swagger';
import { getPool } from './db/connection';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { upload, verifyFileSignature } from './middleware/upload';
import { authenticate, authorize } from './middleware/auth';
import { csrfProtect } from './middleware/csrf';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import regionRoutes from './routes/regions';
import regionalStateRoutes from './routes/regionalStates';
import churchRoutes from './routes/churches';
import languageRoutes from './routes/languages';
import groupRoutes from './routes/groups';
import dashboardRoutes from './routes/dashboard';
import mediaRoutes from './routes/media';
import reportRoutes from './routes/report';
import auditLogRoutes from './routes/audit';
import settingsRoutes from './routes/settings';
import backupRoutes from './routes/backup';

const app = express();

app.set('trust proxy', 1);

/* =========================================================
   CREATE REQUIRED DIRECTORIES
========================================================= */

if (!fs.existsSync(config.upload.dir)) {
  fs.mkdirSync(config.upload.dir, { recursive: true });
}

const reportsDir = path.join(config.upload.dir, 'reports');

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/* =========================================================
   SECURITY MIDDLEWARE
========================================================= */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

/* =========================================================
   BODY PARSING
========================================================= */

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =========================================================
   STATIC UPLOAD FILES
========================================================= */

app.use(
  '/uploads',
  (req, res, next) => {
    // Sensitive reports must never be served directly.
    // They must be downloaded through the authenticated
    // /api/reports/:id/download endpoint.
    if (req.path.startsWith('/reports/')) {
      return res.status(404).json({
        success: false,
        message: 'Not found',
      });
    }

    next();
  },
  express.static(path.join(process.cwd(), config.upload.dir), {
    dotfiles: 'ignore',
    index: false,
  })
);

/* =========================================================
   GENERAL API RATE LIMIT
========================================================= */

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

app.use('/api', limiter);

/* =========================================================
   LOGIN RATE LIMIT
========================================================= */

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message:
      'Too many login attempts. Please try again in 15 minutes.',
  },
});

app.use('/api/auth/login', loginLimiter);

/* =========================================================
   REFRESH TOKEN RATE LIMIT
========================================================= */

app.use(
  '/api/auth/refresh',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
    },
  })
);

/* =========================================================
   CSRF PROTECTION (cookie-authenticated browser requests)
========================================================= */

app.use('/api', csrfProtect);

/* =========================================================
   SWAGGER
========================================================= */

const swaggerEnabled =
  ['development', 'test'].includes(config.nodeEnv) ||
  process.env.ENABLE_SWAGGER === 'true';

if (swaggerEnabled) {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
  );
} else {
  app.get('/api-docs', (_req, res) => {
    res.status(404).json({
      success: false,
      message: 'Not found',
    });
  });
}

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'YDCS Radio Backend is up and running!',
    status: 'online',
    environment: config.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      apiDocs: '/api-docs',
    },
  });
});

app.get('/api/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  let dbError: string | null = null;

  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    // Never leak connection details/credentials through the public health endpoint.
    dbError = 'Database connection check failed';
  }

  res.status(200).json({
    success: true,
    message: 'YDCS API is running',
    status: 'online',
    database: dbStatus,
    ...(dbError ? { dbError } : {}),
    environment: config.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   API ROUTES
========================================================= */

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/regional-states', regionalStateRoutes);
app.use('/api/regions', regionRoutes);
app.use('/api/churches', churchRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backups', backupRoutes);

/* =========================================================
   FILE UPLOAD
========================================================= */

app.post(
  '/api/upload',
  authenticate,
  authorize('admin', 'radio_assistant'),
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    if (
      !verifyFileSignature(
        req.file.path,
        req.file.mimetype
      )
    ) {
      fs.unlinkSync(req.file.path);

      return res.status(400).json({
        success: false,
        message:
          'File content does not match its declared type',
      });
    }

    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      data: {
        url,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
      },
    });
  }
);

/* =========================================================
   ERROR HANDLERS
========================================================= */

app.use(notFoundHandler);
app.use(errorHandler);

export default app;