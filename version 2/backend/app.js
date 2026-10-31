const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const fs = require('node:fs');

function createApp({ connectOnRequest = false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.VERCEL) app.set('trust proxy', 1);
  const origins = (process.env.APP_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5002').split(',').map(value => value.trim());
  app.use(require('cors')({ origin(origin, callback) { callback(null, !origin || origins.includes(origin)); }, credentials: true }));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin)) {
      return res.status(403).json({ message: 'Origin not allowed.' });
    }
    next();
  });
  app.use(express.json({ limit: '3mb' }));
  app.use(express.urlencoded({ extended: true, limit: '3mb' }));
  app.use(cookieParser());
  app.get('/api/health', (_req, res) => res.json({
    status: 'ok', version: '2.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  }));
  app.get('/api/ready', async (_req, res) => {
    if (connectOnRequest) { try { await require('./database').connectDatabase(); } catch {} }
    res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
  });
  app.get('/api/realtime/config', (_req, res) => {
    if (process.env.VERCEL) return res.status(503).json({ message: 'Live messaging is not configured for this deployment.' });
    res.json({ transport: 'websocket' });
  });
  app.get('/api/auth/google/config', require('./controllers/authController').getGoogleConfig);
  app.post('/api/auth/logout', (req, res) => {
    try {
      const decoded = require('jsonwebtoken').verify(req.cookies.token, process.env.JWT_SECRET);
      app.locals.realtime?.disconnect(decoded.userId || decoded.id);
    } catch { /* Clearing a missing or expired session is safe. */ }
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    res.json({ message: 'Signed out' });
  });
  app.use('/api', async (_req, res, next) => {
    if (connectOnRequest) {
      try { await require('./database').connectDatabase(); }
      catch { return res.status(503).json({ message: 'Database temporarily unavailable. Please try again.' }); }
    }
    res.set('Cache-Control', 'no-store');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database unavailable. Configure the version 2 database to continue.' });
    }
    next();
  });
  for (const [prefix, file] of Object.entries({
    auth: 'authRoutes', tasks: 'taskRoutes', bids: 'bidRoutes', messages: 'messageRoutes'
  })) app.use(`/api/${prefix}`, require(`./routes/${file}`));
  app.get('/api/avatars/:id', async (req, res, next) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) return res.sendStatus(404);
      const id = new mongoose.Types.ObjectId(req.params.id);
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'avatars' });
      const [file] = await bucket.find({ _id: id }).toArray();
      if (!file) return res.sendStatus(404);
      res.type(file.contentType || 'application/octet-stream');
      bucket.openDownloadStream(id).on('error', next).pipe(res);
    } catch (error) { next(error); }
  });
  if (process.env.ENABLE_PAYMENTS === 'true') {
    app.use('/api/payments', require('./routes/paymentRoutes'));
  } else {
    app.use('/api/payments', (_req, res) => res.status(503).json({ message: 'Payments are not enabled yet' }));
  }
  app.use('/api', (_req, res) => res.status(404).json({ message: 'API route not found' }));
  const uploads = path.join(__dirname, 'uploads');
  if (!process.env.VERCEL) {
    fs.mkdirSync(uploads, { recursive: true });
    app.use('/uploads', express.static(uploads));
  }
  const client = path.resolve(__dirname, '../frontend/dist');
  if (fs.existsSync(path.join(client, 'index.html'))) {
    app.use(express.static(client));
    app.get('*', (_req, res) => res.sendFile(path.join(client, 'index.html')));
  }
  app.use((_req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use((error, _req, res, _next) => {
    console.error(error.message);
    res.status(error.status === 413 ? 413 : 500).json({ message: error.status === 413 ? 'Upload or request is too large.' : 'Something went wrong. Please try again.' });
  });
  return app;
}

module.exports = { createApp };

