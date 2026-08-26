require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const isProduction = process.env.NODE_ENV === 'production';
const requiredEnvironment = ['MONGODB_URI', 'JWT_SECRET', 'APP_ORIGIN'];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);

if (isProduction && missingEnvironment.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvironment.join(', ')}`);
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'development-only-change-before-deploying';
  console.warn('Using a development-only JWT secret.');
}

// Initialize the Express app
const app = express();
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const cookieParser = require('cookie-parser');
app.use(cookieParser());
// Import all routes
console.log('[DEBUG] Importing routes...');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const bidRoutes = require('./routes/bidRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const messageRoutes = require('./routes/messageRoutes');

console.log('[DEBUG] All routes imported successfully');

// Enhanced CORS configuration
const configuredOrigins = (process.env.APP_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const developmentOrigins = ['http://localhost:5001', 'http://127.0.0.1:5001'];

app.use(cors({
  origin(origin, callback) {
    const allowedOrigins = isProduction ? configuredOrigins : [...developmentOrigins, ...configuredOrigins];
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'views')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Use all routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/bids', bidRoutes);
if (process.env.ENABLE_PAYMENTS === 'true') {
  app.use('/api/payments', paymentRoutes);
} else {
  app.use('/api/payments', (req, res) => {
    res.status(503).json({ message: 'Payments are not enabled yet' });
  });
}
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'degraded',
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Internal server error',
    ...(!isProduction && { error: err.message })
  });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tasky', {
      serverSelectionTimeoutMS: 10000
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
};

// Start server
const startServer = async () => {
  await connectDB();
};

let server;

startServer()
  .then(() => {
    const port = process.env.PORT || 5001;
    server = app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch(() => process.exit(1));

const shutdown = (signal) => {
  console.log(`${signal} received; shutting down gracefully`);
  if (!server) return mongoose.disconnect().finally(() => process.exit(0));
  server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
