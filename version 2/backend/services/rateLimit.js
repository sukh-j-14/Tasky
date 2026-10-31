const crypto = require('node:crypto');
const mongoose = require('mongoose');
const schema = new mongoose.Schema({ _id: String, count: Number, expiresAt: Date });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Limit = mongoose.models.RequestLimit || mongoose.model('RequestLimit', schema);
module.exports = (maxRequests = 100, windowMs = 900000) => async (req, res, next) => {
  try {
    const window = Math.floor(Date.now() / windowMs);
    const key = crypto.createHash('sha256').update(`${req.ip}|${req.baseUrl}${req.path}|${window}`).digest('hex');
    const limit = await Limit.findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) } }, { upsert: true, new: true });
    if (limit.count > maxRequests) { res.set('Retry-After', String(Math.ceil(((window + 1) * windowMs - Date.now()) / 1000))); return res.status(429).json({ message: 'Too many requests. Please try again later.' }); }
    next();
  } catch { res.status(503).json({ message: 'Please try again shortly.' }); }
};
