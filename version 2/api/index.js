const { validateProduction } = require('../backend/production');
validateProduction();
const { createApp } = require('../backend/app');
module.exports = createApp({ connectOnRequest: true });
