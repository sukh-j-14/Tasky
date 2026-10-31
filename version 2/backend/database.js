const mongoose = require('mongoose');
let connection;
async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (!connection) connection = mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || 'tasky_v2', maxPoolSize: 5,
    serverSelectionTimeoutMS: 8000, autoIndex: false
  }).catch(error => { connection = null; throw error; });
  await connection;
  return mongoose.connection;
}
module.exports = { connectDatabase };
