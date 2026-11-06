function simulationEnabled() {
 return process.env.PAYMENT_SIMULATION === 'true' &&
  (process.env.VERCEL_ENV === 'preview' || (!process.env.VERCEL && process.env.NODE_ENV !== 'production'));
}
module.exports = { simulationEnabled };
