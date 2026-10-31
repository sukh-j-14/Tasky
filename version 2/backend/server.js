const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const { createApp } = require('./app');
const { createServer } = require('node:http');
const { attachRealtime } = require('./realtime');

async function start() {
  if (!process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI)) {
    throw new Error('Configure JWT_SECRET and, in production, MONGODB_URI in backend/.env');
  }
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME || 'tasky_v2', serverSelectionTimeoutMS: 10000 });
  }
  const app = createApp();
  const server = createServer(app);
  const origins = (process.env.APP_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5002').split(',').map(value => value.trim());
  const realtime = attachRealtime(server, { origins });
  app.locals.realtime = realtime;
  server.listen(process.env.PORT || 5002, () => console.log('Tasky v2 API and WebSockets ready'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    realtime.close();
    server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
start().catch(error => { console.error(error.message); process.exitCode = 1; });

