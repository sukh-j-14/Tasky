const { validateProduction } = require('../version 2/backend/production');
validateProduction();
module.exports = require('../version 2/backend/app').createApp({ connectOnRequest: true });
