const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewars/auth.middleware');

// Apply authentication to all routes
router.use(authMiddleware.authenticateUser);

// Create a payment (escrow)
router.post('/create', 
  authMiddleware.requireClient,
  paymentController.createPayment
);

// Release escrow payment
router.post('/:paymentId/release', paymentController.releasePayment);

// Request refund
router.post('/:paymentId/refund-request', paymentController.requestRefund);

// Process refund (admin only)
router.post('/:paymentId/refund-process', 
  authMiddleware.requireAdmin,
  paymentController.processRefund
);

// Get payment history
router.get('/history', paymentController.getPaymentHistory);

// Get payment statistics
router.get('/stats', paymentController.getPaymentStats);

// Add funds to wallet
router.post('/add-funds', paymentController.addFunds);

// Withdraw funds from wallet
router.post('/withdraw-funds', paymentController.withdrawFunds);

module.exports = router;

