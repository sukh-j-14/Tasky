const Payment = require('../models/Payment');
const Task = require('../models/Task');
const Bid = require('../models/Bid');
const User = require('../models/User');
const { Message, Conversation } = require('../models/Message');

// Create a payment (escrow)
exports.createPayment = async (req, res) => {
  try {
    const { taskId, bidId, amount, paymentMethod } = req.body;
    const clientId = req.user.id;

    // Validate required fields
    if (!taskId || !bidId || !amount || !paymentMethod) {
      return res.status(400).json({ 
        message: 'Missing required fields: taskId, bidId, amount, paymentMethod' 
      });
    }

    // Check if task exists and is in progress
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status !== 'in-progress') {
      return res.status(400).json({ message: 'Task is not in progress' });
    }

    // Check if user is the task owner
    if (task.clientId.toString() !== clientId) {
      return res.status(403).json({ message: 'Only task owner can create payments' });
    }

    // Check if bid exists and is accepted
    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    if (bid.status !== 'accepted') {
      return res.status(400).json({ message: 'Bid is not accepted' });
    }

    // Check if payment already exists for this bid
    const existingPayment = await Payment.findOne({ bidId });
    if (existingPayment) {
      return res.status(400).json({ message: 'Payment already exists for this bid' });
    }

    // Generate unique transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment
    const payment = new Payment({
      transactionId,
      taskId,
      bidId,
      clientId,
      freelancerId: bid.bidderId,
      amount,
      paymentMethod,
      status: 'pending'
    });

    await payment.save();

    // Update user wallet (deduct from client)
    await User.findByIdAndUpdate(clientId, {
      $inc: { walletBalance: -amount }
    });

    // Create system message
    const conversation = await Conversation.findOne({ 
      taskId: task._id, 
      bidId: bidId 
    });

    if (conversation) {
      const systemMessage = new Message({
        conversationId: conversation._id,
        senderId: clientId,
        receiverId: bid.bidderId,
        message: `Payment of $${amount} has been placed in escrow for the task "${task.title}"`,
        messageType: 'system',
        isSystemMessage: true,
        systemMessageType: 'payment_received'
      });
      await systemMessage.save();
    }

    res.status(201).json({
      message: 'Payment created successfully',
      payment
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Failed to create payment' });
  }
};

// Release escrow payment
exports.releasePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;
    const { milestoneId } = req.body;

    const payment = await Payment.findById(paymentId).populate('taskId');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const task = payment.taskId;

    // Check if user is authorized to release payment
    const isClient = payment.clientId.toString() === userId;
    const isFreelancer = payment.freelancerId.toString() === userId;
    
    if (!isClient && !isFreelancer) {
      return res.status(403).json({ message: 'Unauthorized to release payment' });
    }

    // Check if payment is in escrow
    if (!payment.isEscrow || payment.escrowReleased) {
      return res.status(400).json({ message: 'Payment is not in escrow or already released' });
    }

    // Check if task is completed (for full payment release)
    if (!milestoneId && task.status !== 'completed') {
      return res.status(400).json({ message: 'Task must be completed to release full payment' });
    }

    // Update payment status
    payment.escrowReleased = true;
    payment.escrowReleasedAt = new Date();
    payment.escrowReleasedBy = userId;
    payment.status = 'completed';
    payment.completedAt = new Date();

    await payment.save();

    // Transfer money to freelancer
    await User.findByIdAndUpdate(payment.freelancerId, {
      $inc: { 
        walletBalance: payment.freelancerAmount,
        totalEarnings: payment.freelancerAmount
      }
    });

    // Update client spending
    await User.findByIdAndUpdate(payment.clientId, {
      $inc: { totalSpent: payment.amount }
    });

    // Update task status if full payment
    if (!milestoneId) {
      task.status = 'completed';
      task.completedAt = new Date();
      await task.save();
    }

    // Create system message
    const conversation = await Conversation.findOne({ 
      taskId: task._id, 
      bidId: payment.bidId 
    });

    if (conversation) {
      const systemMessage = new Message({
        conversationId: conversation._id,
        senderId: userId,
        receiverId: isClient ? payment.freelancerId : payment.clientId,
        message: `Payment of $${payment.freelancerAmount} has been released${milestoneId ? ' for milestone' : ''}`,
        messageType: 'system',
        isSystemMessage: true,
        systemMessageType: 'payment_received'
      });
      await systemMessage.save();
    }

    res.json({ 
      message: 'Payment released successfully',
      payment
    });

  } catch (error) {
    console.error('Error releasing payment:', error);
    res.status(500).json({ message: 'Failed to release payment' });
  }
};

// Request refund
exports.requestRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;
    const { reason, description } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user is the client
    if (payment.clientId.toString() !== userId) {
      return res.status(403).json({ message: 'Only client can request refund' });
    }

    // Check if payment is in escrow
    if (!payment.isEscrow || payment.escrowReleased) {
      return res.status(400).json({ message: 'Payment is not in escrow or already released' });
    }

    // Update payment status
    payment.status = 'disputed';
    payment.dispute.isDisputed = true;
    payment.dispute.disputedBy = userId;
    payment.dispute.disputeReason = reason;
    payment.dispute.disputeDescription = description;
    payment.dispute.disputedAt = new Date();

    await payment.save();

    res.json({ message: 'Refund requested successfully' });

  } catch (error) {
    console.error('Error requesting refund:', error);
    res.status(500).json({ message: 'Failed to request refund' });
  }
};

// Process refund
exports.processRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { refundAmount, refundReason } = req.body;
    const adminId = req.user.id;

    // Check if user is admin (you might want to implement admin role checking)
    // For now, we'll allow any user to process refunds

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if payment is disputed
    if (!payment.dispute.isDisputed) {
      return res.status(400).json({ message: 'Payment is not disputed' });
    }

    const refundAmountToProcess = refundAmount || payment.amount;

    // Update payment status
    payment.status = 'refunded';
    payment.refund.isRefunded = true;
    payment.refund.refundAmount = refundAmountToProcess;
    payment.refund.refundReason = refundReason;
    payment.refund.refundedAt = new Date();
    payment.refund.refundedBy = adminId;

    await payment.save();

    // Refund money to client
    await User.findByIdAndUpdate(payment.clientId, {
      $inc: { walletBalance: refundAmountToProcess }
    });

    res.json({ message: 'Refund processed successfully' });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Failed to process refund' });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, type, page = 1, limit = 10 } = req.query;

    const query = {
      $or: [
        { clientId: userId },
        { freelancerId: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    if (type === 'sent') {
      query.clientId = userId;
    } else if (type === 'received') {
      query.freelancerId = userId;
    }

    const payments = await Payment.find(query)
      .populate('taskId', 'title')
      .populate('clientId', 'firstName lastName')
      .populate('freelancerId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
};

// Get payment statistics
exports.getPaymentStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Payment.aggregate([
      {
        $match: {
          $or: [
            { clientId: mongoose.Types.ObjectId(userId) },
            { freelancerId: mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalSent: {
            $sum: {
              $cond: [
                { $eq: ['$clientId', mongoose.Types.ObjectId(userId)] },
                '$amount',
                0
              ]
            }
          },
          totalReceived: {
            $sum: {
              $cond: [
                { $eq: ['$freelancerId', mongoose.Types.ObjectId(userId)] },
                '$freelancerAmount',
                0
              ]
            }
          },
          totalTransactions: { $sum: 1 },
          completedTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const user = await User.findById(userId);
    
    res.json({
      walletBalance: user.walletBalance,
      totalEarnings: user.totalEarnings,
      totalSpent: user.totalSpent,
      stats: stats[0] || {
        totalSent: 0,
        totalReceived: 0,
        totalTransactions: 0,
        completedTransactions: 0
      }
    });

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ message: 'Failed to fetch payment statistics' });
  }
};

// Add funds to wallet
exports.addFunds = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // In a real application, you would integrate with a payment gateway here
    // For now, we'll simulate adding funds

    // Update user wallet
    await User.findByIdAndUpdate(userId, {
      $inc: { walletBalance: amount }
    });

    res.json({ 
      message: 'Funds added successfully',
      newBalance: (await User.findById(userId)).walletBalance
    });

  } catch (error) {
    console.error('Error adding funds:', error);
    res.status(500).json({ message: 'Failed to add funds' });
  }
};

// Withdraw funds from wallet
exports.withdrawFunds = async (req, res) => {
  try {
    const { amount, withdrawalMethod } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const user = await User.findById(userId);
    if (user.walletBalance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // In a real application, you would integrate with a payment gateway here
    // For now, we'll simulate withdrawal

    // Update user wallet
    await User.findByIdAndUpdate(userId, {
      $inc: { walletBalance: -amount }
    });

    res.json({ 
      message: 'Withdrawal request submitted successfully',
      newBalance: user.walletBalance - amount
    });

  } catch (error) {
    console.error('Error withdrawing funds:', error);
    res.status(500).json({ message: 'Failed to withdraw funds' });
  }
};


