const Bid = require('../models/Bid');
const Task = require('../models/Task');
const User = require('../models/User');
const { Message, Conversation } = require('../models/Message');
const mongoose = require('mongoose');

const addBidSystemMessage = async ({ bid, task, senderId, receiverId, message, systemMessageType }) => {
  const conversation = await Conversation.findOne({ taskId: task._id, bidId: bid._id });
  if (!conversation) return;

  const systemMessage = await Message.create({
    conversationId: conversation._id,
    senderId,
    receiverId,
    message,
    messageType: 'system',
    isSystemMessage: true,
    systemMessageType
  });
  conversation.lastMessage = systemMessage._id;
  conversation.lastMessageAt = systemMessage.createdAt;
  await conversation.save();
};

// Get all bids for a specific task
exports.getTaskBids = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    // Check if task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is the task owner or has bid on this task
    const isTaskOwner = task.clientId.toString() === userId.toString();
    const userBid = await Bid.findOne({ taskId, bidderId: userId });
    
    
    if (!isTaskOwner && !userBid) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get all bids for this task with bidder details
    const bids = await Bid.find({ taskId })
      .populate('bidderId', 'firstName lastName username email profilePicture rating skills')
      .sort({ createdAt: -1 });

    res.json({
      message: 'Bids retrieved successfully',
      bids,
      task: {
        _id: task._id,
        title: task.title,
        status: task.status,
        clientId: task.clientId,
        selectedBidId: task.selectedBidId
      }
    });

  } catch (error) {
    console.error('Error fetching task bids:', error);
    res.status(500).json({ message: 'Failed to fetch bids' });
  }
};

// Create a new bid
exports.createBid = async (req, res) => {
  try {
    const { taskId, amount, message, proposedTimeline, milestones } = req.body;
    const bidderId = req.user._id;

    // Validate required fields
    if (!taskId || amount === undefined || !message || !proposedTimeline) {
      return res.status(400).json({ 
        message: 'Missing required fields: taskId, amount, message' 
      });
    }

    // Check if task exists and is open for bidding
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.status !== 'open') {
      return res.status(400).json({ message: 'Task is not open for bidding' });
    }

    if (task.biddingType === 'invite-only') {
      return res.status(403).json({ message: 'This task is invite-only' });
    }

    // Check if bidding period has ended
    if (task.biddingEndsAt && new Date() > task.biddingEndsAt) {
      return res.status(400).json({ message: 'Bidding period has ended' });
    }

    // Check if user has already bid on this task
    const existingBid = await Bid.findOne({ taskId, bidderId });
    if (existingBid) {
      return res.status(400).json({ message: 'You have already bid on this task' });
    }

    // Check if user is the task owner
    if (task.clientId.toString() === bidderId.toString()) {
      return res.status(400).json({ message: 'You cannot bid on your own task' });
    }

    // All users can bid on tasks (no freelancer restriction)
    // const user = await User.findById(bidderId);
    // Removed freelancer check - everyone can bid

    // Validate bid amount
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Bid amount must be positive' });
    }

    if (task.currentBidCount >= task.maxBids) {
      return res.status(400).json({ message: 'This task has reached its maximum number of bids' });
    }

    // Create the bid
    const bid = new Bid({
      taskId,
      bidderId,
      amount,
      message,
      proposedTimeline,
      milestones: milestones || []
    });

    await bid.save();

    // Update task bid count
    await Task.findByIdAndUpdate(taskId, { 
      $inc: { currentBidCount: 1 } 
    });

    // Create conversation for this bid
    const conversation = new Conversation({
      participants: [task.clientId, bidderId],
      taskId,
      bidId: bid._id,
      title: `Bid discussion for: ${task.title}`
    });
    await conversation.save();

    // Populate bid with user info
    await bid.populate('bidderId', 'firstName lastName profilePicture rating');

    res.status(201).json({
      message: 'Bid created successfully',
      bid
    });

  } catch (error) {
    console.error('Error creating bid:', error);
    res.status(500).json({ message: 'Failed to create bid' });
  }
};


// Get user's bids
exports.getUserBids = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { bidderId: userId };
    if (status) {
      query.status = status;
    }

    const bids = await Bid.find(query)
      .populate({
        path: 'taskId',
        select: 'title description budget deadline status',
        populate: {
          path: 'clientId',
          select: 'firstName lastName _id'
        }
      })
      .populate('bidderId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Bid.countDocuments(query);

    res.json({
      bids,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching user bids:', error);
    res.status(500).json({ message: 'Failed to fetch bids' });
  }
};

// Accept a bid
exports.acceptBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const { platformFee = 1, totalAmount } = req.body;
    const userId = req.user._id;

    const bid = await Bid.findById(bidId).populate('taskId').populate('bidderId');
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    const task = bid.taskId;
    const freelancer = bid.bidderId;

    // Check if user is the task owner
    if (task.clientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only task owner can accept bids' });
    }

    // Check if task is still open
    if (task.status !== 'open') {
      return res.status(400).json({ message: 'Task is no longer open' });
    }

    // Check if bid is still pending
    if (bid.status !== 'pending') {
      return res.status(400).json({ message: 'Bid is no longer pending' });
    }

    if (bid.counterOffers?.some(offer => offer.status === 'pending')) {
      return res.status(400).json({ message: 'Respond to the pending counter-offer before accepting this bid' });
    }

    // Verify total amount (bid amount + platform fee)
    const expectedTotal = bid.amount + platformFee;
    if (totalAmount && totalAmount !== expectedTotal) {
      return res.status(400).json({ message: 'Invalid total amount' });
    }

    // Update bid status
    bid.status = 'accepted';
    bid.acceptedAt = new Date();
    await bid.save();

    // Update task
    task.status = 'in-progress';
    task.selectedBidId = bidId;
    task.selectedFreelancerId = bid.bidderId;
    task.selectedAt = new Date();
    await task.save();

    // Payment records are created only after a real payment provider is enabled.
    if (process.env.ENABLE_PAYMENTS === 'true') {
      const Payment = require('../models/Payment');
      const payment = new Payment({
        taskId: task._id,
        bidId,
        clientId: userId,
        freelancerId: bid.bidderId,
        amount: bid.amount,
        platformFee,
        totalAmount: expectedTotal,
        status: 'escrowed',
        type: 'task_payment',
        description: `Payment for task: ${task.title}`,
        escrowReleaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      await payment.save();
      task.paymentId = payment._id;
      await task.save();
    }

    // Reject all other bids for this task
    await Bid.updateMany(
      { taskId: task._id, _id: { $ne: bidId } },
      { status: 'rejected', rejectedAt: new Date() }
    );

    // Create system message
    let conversation = await Conversation.findOne({
      taskId: task._id, 
      bidId: bidId 
    });

    // Older bids may not have a conversation, so accepting a bid must guarantee one.
    if (!conversation) {
      conversation = new Conversation({
        participants: [task.clientId, bid.bidderId],
        taskId: task._id,
        bidId: bid._id,
        title: `Bid discussion for: ${task.title}`
      });
      await conversation.save();
    }

    const systemMessage = new Message({
      conversationId: conversation._id,
      senderId: userId,
      receiverId: bid.bidderId,
      message: `Your bid has been accepted for the task "${task.title}"`,
      messageType: 'system',
      isSystemMessage: true,
      systemMessageType: 'bid_accepted'
    });
    await systemMessage.save();

    conversation.lastMessage = systemMessage._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.json({ 
      message: 'Bid accepted successfully',
      bid,
      task,
      conversationId: conversation._id
    });

  } catch (error) {
    console.error('Error accepting bid:', error);
    res.status(500).json({ message: 'Failed to accept bid' });
  }
};

// Create a counter-offer. The owner initiates, then the two parties alternate turns.
exports.createCounterOffer = async (req, res) => {
  try {
    const { bidId } = req.params;
    const amount = Number(req.body.amount);
    const userId = req.user._id;

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Offer amount must be positive' });
    }

    const bid = await Bid.findById(bidId).populate('taskId');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    const task = bid.taskId;
    const isOwner = task.clientId.toString() === userId.toString();
    const isBidder = bid.bidderId.toString() === userId.toString();
    if (!isOwner && !isBidder) {
      return res.status(403).json({ message: 'Only the task owner and bidder can negotiate this bid' });
    }
    if (task.status !== 'open' || bid.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending bids on open tasks can be negotiated' });
    }

    const pendingOffer = bid.counterOffers?.find(offer => offer.status === 'pending');
    if (!pendingOffer && !isOwner) {
      return res.status(400).json({ message: 'The task owner must start the bargaining' });
    }
    if (pendingOffer?.proposedBy.toString() === userId.toString()) {
      return res.status(400).json({ message: 'Wait for the other person to respond to your offer' });
    }
    if (pendingOffer) {
      pendingOffer.status = 'countered';
      pendingOffer.respondedAt = new Date();
    }

    bid.counterOffers.push({ amount, proposedBy: userId });
    bid.negotiationStatus = 'negotiating';
    await bid.save();

    const receiverId = isOwner ? bid.bidderId : task.clientId;
    await addBidSystemMessage({
      bid,
      task,
      senderId: userId,
      receiverId,
      message: `New price offer: ₹${amount}`,
      systemMessageType: 'counter_offer'
    });

    res.status(201).json({ message: 'Counter-offer sent', bid });
  } catch (error) {
    console.error('Error creating counter-offer:', error);
    res.status(500).json({ message: 'Failed to create counter-offer' });
  }
};

// Accept the other party's active counter-offer and make it the bid amount.
exports.acceptCounterOffer = async (req, res) => {
  try {
    const { bidId, offerId } = req.params;
    const userId = req.user._id;
    const bid = await Bid.findById(bidId).populate('taskId');
    if (!bid) return res.status(404).json({ message: 'Bid not found' });

    const task = bid.taskId;
    const isOwner = task.clientId.toString() === userId.toString();
    const isBidder = bid.bidderId.toString() === userId.toString();
    if (!isOwner && !isBidder) {
      return res.status(403).json({ message: 'Only the task owner and bidder can accept this offer' });
    }
    if (task.status !== 'open' || bid.status !== 'pending') {
      return res.status(400).json({ message: 'This bid can no longer be negotiated' });
    }

    const offer = bid.counterOffers.id(offerId);
    if (!offer || offer.status !== 'pending') {
      return res.status(404).json({ message: 'Pending offer not found' });
    }
    if (offer.proposedBy.toString() === userId.toString()) {
      return res.status(400).json({ message: 'You cannot accept your own offer' });
    }

    offer.status = 'accepted';
    offer.respondedAt = new Date();
    bid.amount = offer.amount;
    bid.agreedAmount = offer.amount;
    bid.negotiationStatus = 'agreed';
    await bid.save();

    const receiverId = isOwner ? bid.bidderId : task.clientId;
    await addBidSystemMessage({
      bid,
      task,
      senderId: userId,
      receiverId,
      message: `Price agreed at ₹${offer.amount}`,
      systemMessageType: 'offer_accepted'
    });

    res.json({ message: `Offer accepted at ₹${offer.amount}`, bid });
  } catch (error) {
    console.error('Error accepting counter-offer:', error);
    res.status(500).json({ message: 'Failed to accept counter-offer' });
  }
};

// Reject a bid
exports.rejectBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    const bid = await Bid.findById(bidId).populate('taskId');
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    const task = bid.taskId;

    // Check if user is the task owner
    if (task.clientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only task owner can reject bids' });
    }

    // Check if bid is still pending
    if (bid.status !== 'pending') {
      return res.status(400).json({ message: 'Bid is no longer pending' });
    }

    // Update bid status
    bid.status = 'rejected';
    bid.rejectedAt = new Date();
    await bid.save();

    // Create system message
    const conversation = await Conversation.findOne({ 
      taskId: task._id, 
      bidId: bidId 
    });

    if (conversation) {
      const systemMessage = new Message({
        conversationId: conversation._id,
        senderId: userId,
        receiverId: bid.bidderId,
        message: `Your bid has been rejected for the task "${task.title}". ${reason ? `Reason: ${reason}` : ''}`,
        messageType: 'system',
        isSystemMessage: true,
        systemMessageType: 'bid_rejected'
      });
      await systemMessage.save();
      conversation.lastMessage = systemMessage._id;
      conversation.lastMessageAt = systemMessage.createdAt;
      await conversation.save();
    }

    res.json({ message: 'Bid rejected successfully' });

  } catch (error) {
    console.error('Error rejecting bid:', error);
    res.status(500).json({ message: 'Failed to reject bid' });
  }
};

// Withdraw a bid
exports.withdrawBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.user._id;

    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Check if user is the bidder
    if (bid.bidderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only bidder can withdraw bid' });
    }

    // Check if bid is still pending
    if (bid.status !== 'pending') {
      return res.status(400).json({ message: 'Bid cannot be withdrawn' });
    }

    // Update bid status
    bid.status = 'withdrawn';
    bid.withdrawnAt = new Date();
    await bid.save();

    // Update task bid count
    await Task.findByIdAndUpdate(bid.taskId, { 
      $inc: { currentBidCount: -1 } 
    });

    res.json({ message: 'Bid withdrawn successfully' });

  } catch (error) {
    console.error('Error withdrawing bid:', error);
    res.status(500).json({ message: 'Failed to withdraw bid' });
  }
};

// Update a bid
exports.updateBid = async (req, res) => {
  try {
    const { bidId } = req.params;
    const userId = req.user._id;
    const { amount, message, proposedTimeline, milestones } = req.body;

    const bid = await Bid.findById(bidId);
    if (!bid) {
      return res.status(404).json({ message: 'Bid not found' });
    }

    // Check if user is the bidder
    if (bid.bidderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only bidder can update bid' });
    }

    // Check if bid is still pending
    if (bid.status !== 'pending') {
      return res.status(400).json({ message: 'Bid cannot be updated' });
    }

    // Update bid fields
    if (amount !== undefined) {
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Bid amount must be positive' });
      }
      bid.amount = Number(amount);
    }
    if (message !== undefined) bid.message = message;
    if (proposedTimeline !== undefined) bid.proposedTimeline = proposedTimeline;
    if (milestones !== undefined) bid.milestones = milestones;

    await bid.save();

    res.json({ 
      message: 'Bid updated successfully',
      bid
    });

  } catch (error) {
    console.error('Error updating bid:', error);
    res.status(500).json({ message: 'Failed to update bid' });
  }
};


// Get bid statistics
exports.getBidStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Bid.aggregate([
      { $match: { bidderId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalBids = await Bid.countDocuments({ bidderId: userId });
    const acceptedBids = await Bid.countDocuments({ 
      bidderId: userId, 
      status: 'accepted' 
    });

    res.json({
      totalBids,
      acceptedBids,
      acceptanceRate: totalBids > 0 ? (acceptedBids / totalBids * 100).toFixed(2) : 0,
      stats
    });

  } catch (error) {
    console.error('Error fetching bid stats:', error);
    res.status(500).json({ message: 'Failed to fetch bid statistics' });
  }
};
