const router = require('express').Router();
const { authenticateUser } = require('../middlewars/auth.middleware');
const workflow = require('../services/projectWorkflow');
router.use((_req, res, next) => require('../paymentMode').simulationEnabled() ? next() : res.status(404).json({ message: 'Payment simulation is unavailable.' }));
router.use(authenticateUser);
router.get('/tasks/:id', workflow.readSimulation);
router.post('/tasks/:id/fund', workflow.fundSimulation);
module.exports = router;
