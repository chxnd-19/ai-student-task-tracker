const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const dotenv      = require('dotenv');
const path        = require('path');
const rateLimit   = require('express-rate-limit');
const connectDB   = require('./config/db');
const authRoutes         = require('./routes/authRoutes');
const taskRoutes         = require('./routes/taskRoutes');
const submissionRoutes   = require('./routes/submissionRoutes');
const classRoutes        = require('./routes/classRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes      = require('./routes/profileRoutes');
const errorHandler       = require('./middleware/errorHandler');

dotenv.config();

// ── Env validation ───────────────────────────────────────────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
if (process.env.NODE_ENV === 'production') REQUIRED_ENV.push('FRONTEND_URL');
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[startup] Missing required env vars: ${missing.join(', ')}`);
  console.error('[startup] See backend/.env.example for reference.');
  process.exit(1);
}

connectDB();

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    success: false, message: 'Too many requests. Please wait a moment and try again.',
  }),
});

app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/classes',      classRoutes);
app.use('/api/tasks',        taskRoutes);
app.use('/api/submissions',  submissionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile',      profileRoutes);

app.get('/',           (req, res) => res.json({ success: true, message: 'API is running.' }));
app.get('/api/health', (req, res) => res.json({ success: true }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found.' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  }
});
