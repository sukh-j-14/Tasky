const {connectDatabase} = require('../database');
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
(async () => {
 await connectDatabase();
 for(const file of ['User','Task','Bid','Message','SimulatedPayment']) require(`../models/${file}`);
 require('../services/rateLimit');
 for (const model of Object.values(require('mongoose').models)) await model.createIndexes();
 console.log('Database indexes prepared.');
 await require('mongoose').disconnect();
})().catch(error => {console.error(error.message); process.exitCode=1;});
