require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// CORS Restriction
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate Limiting
app.use('/api/', apiLimiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const bookmarkRoutes = require('./routes/bookmarks');
const fileOrganizerRoutes = require('./routes/fileOrganizer');
const passwordAuditorRoutes = require('./routes/passwordAuditor');
const digitalDetoxRoutes = require('./routes/digitalDetox');
const focusTimerRoutes = require('./routes/focusTimer');
const aiRoutes = require('./routes/ai');
const profileRoutes = require('./routes/profile');
const settingsRoutes = require('./routes/settings');
const notificationRoutes = require('./routes/notifications');
const feedbackRoutes = require('./routes/feedback');
const adminRoutes = require('./routes/admin');
const searchRoutes = require('./routes/search');
const exportRoutes = require('./routes/export');
const uploadRoutes = require('./routes/upload');
const extensionRoutes = require('./routes/extension');
const habitsRoutes = require('./routes/habits');
const goalsRoutes = require('./routes/goals');
const usageRoutes = require('./routes/usage');

// Initialize new tables on startup
const pool = require('./db');
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        token TEXT PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        endpoint VARCHAR(200),
        input_data JSONB,
        result JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        endpoint VARCHAR(200),
        tokens_used INTEGER DEFAULT 0,
        cost_estimate NUMERIC(10,6) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        name VARCHAR(255) NOT NULL,
        frequency VARCHAR(50) DEFAULT 'daily',
        target_count INTEGER DEFAULT 1,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id SERIAL PRIMARY KEY,
        habit_id INTEGER,
        user_id INTEGER,
        count INTEGER DEFAULT 1,
        notes TEXT,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        target_date DATE,
        progress_pct INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        ai_plan JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('All new tables initialized successfully');
  } catch (err) {
    console.error('Table initialization error:', err.message);
  }
})();

app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/file-organizer', fileOrganizerRoutes);
app.use('/api/password-auditor', passwordAuditorRoutes);
app.use('/api/digital-detox', digitalDetoxRoutes);
app.use('/api/focus-timer', focusTimerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/extension', extensionRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/usage', usageRoutes);
// Apply pass 5 — additive backlog routes
app.use('/api/backlog', require('./routes/backlog'));

// Health Check Endpoint (enhanced)
app.get('/api/health', async (req, res) => {
  try {
    const pool = require('./db');
    const dbCheck = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      message: 'AI Productivity Hub API is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      dbTime: dbCheck.rows[0].now,
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    name: 'AI Productivity Hub API',
    version: '2.0.0',
    description: 'Comprehensive AI-powered productivity tools API',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login and get JWT token',
        'GET /api/auth/me': 'Get current user info',
        'POST /api/auth/refresh-token': 'Refresh JWT token',
        'POST /api/auth/forgot-password': 'Request password reset',
        'POST /api/auth/reset-password': 'Reset password with token',
        'POST /api/auth/verify-email': 'Verify email address',
        'POST /api/auth/resend-verification': 'Resend verification email',
        'POST /api/auth/change-password': 'Change password'
      },
      profile: {
        'GET /api/profile': 'Get user profile with stats',
        'PUT /api/profile': 'Update user profile',
        'POST /api/profile/complete-onboarding': 'Mark onboarding complete'
      },
      settings: {
        'GET /api/settings': 'Get user settings',
        'PUT /api/settings': 'Update user settings'
      },
      bookmarks: {
        'GET /api/bookmarks': 'List bookmarks (supports ?page, ?limit, ?search)',
        'GET /api/bookmarks/:id': 'Get single bookmark',
        'POST /api/bookmarks': 'Create bookmark',
        'PUT /api/bookmarks/:id': 'Update bookmark',
        'DELETE /api/bookmarks/:id': 'Delete bookmark',
        'POST /api/bookmarks/:id/categorize': 'AI categorize bookmark'
      },
      fileOrganizer: {
        'GET /api/file-organizer': 'List files',
        'POST /api/file-organizer': 'Add file entry',
        'PUT /api/file-organizer/:id': 'Update file',
        'DELETE /api/file-organizer/:id': 'Delete file'
      },
      passwordAuditor: {
        'GET /api/password-auditor': 'List passwords',
        'POST /api/password-auditor': 'Add password entry',
        'POST /api/password-auditor/:id/audit': 'AI audit password'
      },
      digitalDetox: {
        'GET /api/digital-detox': 'List screen time entries',
        'POST /api/digital-detox': 'Create entry',
        'POST /api/digital-detox/analyze': 'AI analyze patterns'
      },
      focusTimer: {
        'GET /api/focus-timer': 'List focus sessions',
        'POST /api/focus-timer': 'Create session',
        'POST /api/focus-timer/:id/start': 'Start session'
      },
      notifications: {
        'GET /api/notifications': 'List notifications',
        'PUT /api/notifications/:id/read': 'Mark as read',
        'PUT /api/notifications/read-all': 'Mark all as read'
      },
      search: { 'GET /api/search?q=term': 'Global search' },
      export: {
        'GET /api/export/bookmarks': 'Export bookmarks (json/csv)',
        'GET /api/export/passwords': 'Export password audit',
        'GET /api/export/all': 'Export all data'
      },
      upload: { 'POST /api/upload': 'Upload file' },
      feedback: {
        'POST /api/feedback': 'Submit feedback',
        'POST /api/feedback/contact': 'Send contact message'
      },
      admin: {
        'GET /api/admin/stats': 'Admin dashboard stats',
        'GET /api/admin/users': 'List all users',
        'GET /api/admin/audit-logs': 'View audit logs'
      },
      extension: {
        'POST /api/extension/bookmarks/import': 'Import bookmarks from browser extension',
        'POST /api/extension/bookmarks/quick-save': 'Quick save current page',
        'GET /api/extension/status': 'Check extension connection & stats',
        'POST /api/extension/screen-time': 'Report screen time from extension'
      },
      health: { 'GET /api/health': 'Health check' }
    }
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  
// === Custom Feature Mounts (batch_06) ===
app.use('/api/cf-agentic-goal-orchestration', require('./routes/customFeat01_AgenticGoalOrchestration'));
app.use('/api/cf-distraction-detector', require('./routes/customFeat02_DistractionDetector'));
app.use('/api/cf-digital-wellbeing-coach', require('./routes/customFeat03_DigitalWellbeingCoach'));
app.use('/api/cf-weekly-autopilot', require('./routes/customFeat04_WeeklyAutopilot'));
app.use('/api/cf-cross-tool-optimization', require('./routes/customFeat05_CrossToolOptimization'));


// === Batch 06 Gaps & Frontend Mounts ===
app.use('/api/gap-goals-without-goal', require('./routes/gapFeat_goals_without_goal'));
app.use('/api/gap-habits-without-habit', require('./routes/gapFeat_habits_without_habit'));
app.use('/api/gap-focus-without-focus', require('./routes/gapFeat_focus_without_focus'));
app.use('/api/gap-usage-without-usage', require('./routes/gapFeat_usage_without_usage'));
app.use('/api/gap-limited-calendar-integration-no-native-task-schedu', require('./routes/gapFeat_limited_calendar_integration_no_native_task_schedu'));
app.use('/api/gap-limited-integration-with-communication-tools-email', require('./routes/gapFeat_limited_integration_with_communication_tools_email'));
app.use('/api/gap-no-ai', require('./routes/gapFeat_no_ai'));
app.use('/api/gap-limited-team-collaboration-features', require('./routes/gapFeat_limited_team_collaboration_features'));
app.use('/api/gap-no-integration-with-fitness-health-activity-sleep', require('./routes/gapFeat_no_integration_with_fitness_health_activity_sleep'));
app.use('/api/gap-webhook-scaffolding-exists-but-not-full-end', require('./routes/gapFeat_webhook_scaffolding_exists_but_not_full_end'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API docs: http://localhost:${PORT}/api/docs`);
  });
}

module.exports = app;
