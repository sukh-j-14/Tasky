function validateProduction() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) return;
  for (const name of ['MONGODB_URI', 'MONGODB_DB_NAME', 'JWT_SECRET', 'APP_ORIGIN']) {
    if (!process.env[name]) throw new Error(`Missing ${name}`);
  }
  if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace-')) throw new Error('Use a random JWT_SECRET of at least 32 characters');
  if (process.env.APP_ORIGIN.split(',').some(origin => !/^https:\/\/[^/]+$/.test(origin.trim()))) throw new Error('APP_ORIGIN must contain exact HTTPS origins without trailing slashes');
  if (process.env.ENABLE_PAYMENTS === 'true') throw new Error('Payments cannot be enabled before a verified payment provider is implemented');
  if (process.env.PAYMENT_SIMULATION === 'true' && !require('./paymentMode').simulationEnabled()) throw new Error('Payment simulation is restricted to development and preview environments');
}
module.exports = { validateProduction };
