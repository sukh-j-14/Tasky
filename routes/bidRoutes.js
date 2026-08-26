const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bidController');
const authMiddleware = require('../middlewars/auth.middleware');

// Apply authentication to all routes
router.use(authMiddleware.authenticateUser);

// Create a new bid
router.post('/', 
  bidController.createBid
);

// Get all bids for a specific task
router.get('/task/:taskId', bidController.getTaskBids);

// Get user's bids
router.get('/my-bids', bidController.getUserBids);

// Get bid statistics
router.get('/stats', bidController.getBidStats);

// Accept a bid (task owner only)
router.post('/:bidId/accept', bidController.acceptBid);

// Reject a bid (task owner only)
router.post('/:bidId/reject', bidController.rejectBid);

// Withdraw a bid (bidder only)
router.post('/:bidId/withdraw', bidController.withdrawBid);

// Update a bid (bidder only)
router.put('/:bidId', bidController.updateBid);

module.exports = router;

