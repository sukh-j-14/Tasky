const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Task = require('../models/Task');
const Bid = require('../models/Bid');
const { Message, Conversation } = require('../models/Message');
const authMiddleware = require('../middlewars/auth.middleware')
const jwt = require("jsonwebtoken")
const router = express.Router();

const MAX_TASK_FILE_SIZE = 10 * 1024 * 1024;
const allowedTaskFileExtensions = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']);
const allowedTaskMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png'
]);
const taskFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_TASK_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedTaskFileExtensions.has(extension) || !allowedTaskMimeTypes.has(file.mimetype)) {
      return callback(new Error('Unsupported file type. Upload a PDF, Word, Excel, JPG, or PNG file.'));
    }
    callback(null, true);
  }
});

const getTaskAttachmentsBucket = () => new mongoose.mongo.GridFSBucket(
  mongoose.connection.db,
  { bucketName: 'taskAttachments' }
);

const runTaskFileUpload = (req, res, next) => {
  taskFileUpload.single('taskFile')(req, res, error => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'The document must be 10MB or smaller.' });
    }
    return res.status(400).json({ message: error.message || 'Could not upload the document.' });
  });
};

const editableTaskFields = [
  'title', 'description', 'category', 'subcategory', 'contactPhone', 'contactMethod',
  'budget', 'budgetType', 'hourlyRate', 'estimatedHours', 'deadline', 'startDate',
  'estimatedDuration', 'skills', 'experienceLevel', 'requirements',
  'biddingType', 'maxBids', 'biddingEndsAt', 'milestones', 'isPublic', 'isUrgent',
  'location', 'country', 'city', 'language'
];

const pickTaskFields = (source) => Object.fromEntries(
  editableTaskFields.filter(field => source[field] !== undefined).map(field => [field, source[field]])
);

// Create a new task
router.post('/', authMiddleware.authenticateUser, async (req, res) => {
  try {
    console.log('Incoming task data:', req.body);
    
    // Validate required fields
    if (!req.body.title || !req.body.description || !req.body.category || req.body.budget === undefined || req.body.budget === null || req.body.budget === '') {
      return res.status(400).json({ message: 'Missing required fields: title, description, category, budget' });
    }

    // Ensure deadline is a valid date
    if (!req.body.deadline || isNaN(new Date(req.body.deadline))) {
      return res.status(400).json({ message: 'Invalid deadline format' });
    }

    const requestedAttachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    if (requestedAttachments.length > 1) {
      return res.status(400).json({ message: 'Only one supporting document can be attached to a task.' });
    }

    const attachments = [];
    for (const requestedAttachment of requestedAttachments) {
      if (!requestedAttachment || !mongoose.isValidObjectId(requestedAttachment.filename)) {
        return res.status(400).json({ message: 'Invalid task document.' });
      }
      const fileId = new mongoose.Types.ObjectId(requestedAttachment.filename);
      const [file] = await mongoose.connection.db.collection('taskAttachments.files').find({
        _id: fileId,
        'metadata.uploadedBy': req.user._id,
        'metadata.taskId': { $exists: false }
      }).limit(1).toArray();
      if (!file) {
        return res.status(400).json({ message: 'The uploaded document was not found or does not belong to you.' });
      }
      attachments.push({
        filename: file._id.toString(),
        originalName: file.metadata.originalName,
        url: `/api/tasks/attachments/${file._id}`,
        fileSize: file.length,
        mimeType: file.contentType || file.metadata.mimeType
      });
    }

    const taskFields = pickTaskFields(req.body);
    const task = new Task({
      ...taskFields,
      attachments,
      clientId: req.user._id,
      email: req.user.email,
      contactName: req.user.firstName + ' ' + req.user.lastName,
      contactEmail: req.user.email,
      deadline: new Date(req.body.deadline)
    });

    const savedTask = await task.save();
    if (attachments.length) {
      const attachmentIds = attachments.map(attachment => new mongoose.Types.ObjectId(attachment.filename));
      await mongoose.connection.db.collection('taskAttachments.files').updateMany(
        { _id: { $in: attachmentIds } },
        { $set: { 'metadata.taskId': savedTask._id } }
      );
    }
    await require('../models/User').findByIdAndUpdate(req.user._id, { $inc: { tasksPosted: 1 } });
    console.log('Task saved successfully:', savedTask);
    
    // Populate client info
    await savedTask.populate('clientId', 'firstName lastName profilePicture rating');
    
    res.status(201).json(savedTask);
    
  } catch (error) {
    console.error('Task save error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Task with similar details already exists'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to save task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload one supporting document before creating a task.
router.post('/attachments', authMiddleware.authenticateUser, runTaskFileUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Choose a document to upload.' });
    }

    const bucket = getTaskAttachmentsBucket();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {
        uploadedBy: req.user._id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype
      }
    });

    await new Promise((resolve, reject) => {
      uploadStream.once('finish', resolve);
      uploadStream.once('error', reject);
      uploadStream.end(req.file.buffer);
    });

    res.status(201).json({
      attachment: {
        filename: uploadStream.id.toString(),
        originalName: req.file.originalname,
        url: `/api/tasks/attachments/${uploadStream.id}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Task document upload error:', error);
    res.status(500).json({ message: 'Failed to upload the task document.' });
  }
});

// Download a supporting document. Public-task files are available to signed-in users;
// private-task files are limited to the owner, selected freelancer, and bidders.
router.get('/attachments/:fileId', authMiddleware.authenticateUser, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.fileId)) {
      return res.status(400).json({ message: 'Invalid document ID.' });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.fileId);
    const [file] = await mongoose.connection.db.collection('taskAttachments.files')
      .find({ _id: fileId }).limit(1).toArray();
    if (!file || !file.metadata?.taskId) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const task = await Task.findById(file.metadata.taskId).select('clientId selectedFreelancerId isPublic');
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const userId = req.user._id.toString();
    const isParticipant = task.clientId.toString() === userId || task.selectedFreelancerId?.toString() === userId;
    const hasBid = !task.isPublic && !isParticipant
      ? await Bid.exists({ taskId: task._id, bidderId: req.user._id })
      : false;
    if (!task.isPublic && !isParticipant && !hasBid) {
      return res.status(403).json({ message: 'You do not have access to this document.' });
    }

    const originalName = file.metadata.originalName || file.filename || 'task-document';
    const asciiName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.set({
      'Content-Type': file.contentType || file.metadata.mimeType || 'application/octet-stream',
      'Content-Length': file.length,
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(originalName)}`,
      'Cache-Control': 'private, no-store'
    });

    const downloadStream = getTaskAttachmentsBucket().openDownloadStream(fileId);
    downloadStream.once('error', error => {
      console.error('Task document download error:', error);
      if (!res.headersSent) res.status(500).json({ message: 'Failed to download the document.' });
      else res.destroy(error);
    });
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Task document download error:', error);
    res.status(500).json({ message: 'Failed to download the document.' });
  }
});

// Get all tasks (for public browsing)
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      minBudget, 
      maxBudget, 
      status = 'open',
      page = 1, 
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { isPublic: true };
    
    if (category) query.category = category;
    if (status) query.status = status;
    if (minBudget || maxBudget) {
      query.budget = {};
      if (minBudget) query.budget.$gte = Number(minBudget);
      if (maxBudget) query.budget.$lte = Number(maxBudget);
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    // Build sort object
    const allowedSortFields = ['createdAt', 'deadline', 'budget', 'views'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 10));
    const sort = { [safeSortBy]: sortOrder === 'asc' ? 1 : -1 };

    const tasks = await Task.find(query)
      .populate('clientId', 'firstName lastName profilePicture rating')
      .sort(sort)
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit);

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      totalPages: Math.ceil(total / safeLimit),
      currentPage: safePage,
      total
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Get tasks posted by a specific user
router.get('/posted', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { clientId: req.user._id };
    if (status) query.status = status;
    
    const tasks = await Task.find(query)
      .populate('selectedFreelancerId', 'firstName lastName profilePicture rating')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
                        
    const total = await Task.countDocuments(query);
    
    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ message: 'Failed to fetch user tasks' });
  }
});

// Get single task
router.get('/:id', async (req, res) => {
  try {
    if (!require('mongoose').isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    const task = await Task.findById(req.params.id)
      .populate('clientId', 'firstName lastName profilePicture rating')
      .populate('selectedFreelancerId', 'firstName lastName profilePicture rating');
      
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Increment view count
    await Task.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
});

// Update task
router.put('/:id', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const updates = pickTaskFields(req.body);
    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, clientId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found or you do not own it' });
    }
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({ message: 'Failed to update task' });
  }
});

// Complete task and release payment
router.post('/:id/complete', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user._id;

    const task = await Task.findById(taskId).populate('paymentId');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is the task owner
    if (task.clientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only task owner can complete tasks' });
    }

    // Check if task is in progress
    if (task.status !== 'in-progress') {
      return res.status(400).json({ message: 'Task is not in progress' });
    }

    // Update task status
    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    const acceptedBid = await Bid.findOne({ taskId: task._id, status: 'accepted' });
    if (acceptedBid) {
      acceptedBid.completed = true;
      acceptedBid.completedAt = task.completedAt;
      await acceptedBid.save();

      const conversation = await Conversation.findOne({
        taskId: task._id,
        bidId: acceptedBid._id
      });

      if (conversation) {
        const completionMessage = await Message.create({
          conversationId: conversation._id,
          senderId: userId,
          receiverId: acceptedBid.bidderId,
          message: `The task "${task.title}" has been marked as completed.`,
          messageType: 'system',
          isSystemMessage: true,
          systemMessageType: 'task_completed'
        });
        conversation.lastMessage = completionMessage._id;
        conversation.lastMessageAt = completionMessage.createdAt;
        await conversation.save();
      }
    }

    if (task.selectedFreelancerId) {
      await require('../models/User').findByIdAndUpdate(task.selectedFreelancerId, {
        $inc: { tasksCompleted: 1 }
      });
    }

    // Release payment from escrow
    if (task.paymentId) {
      const Payment = require('../models/Payment');
      const payment = await Payment.findById(task.paymentId);
      
      if (payment && payment.status === 'escrowed') {
        // Update payment status
        payment.status = 'completed';
        payment.completedAt = new Date();
        await payment.save();

        // Transfer money to freelancer (simulate)
        const User = require('../models/User');
        await User.findByIdAndUpdate(payment.freelancerId, {
          $inc: { walletBalance: payment.amount }
        });

        // Add platform fee to company wallet (simulate)
        // In a real app, this would go to a company account
        console.log(`Platform fee of ₹${payment.platformFee} earned from task ${taskId}`);
      }
    }

    res.json({ 
      message: task.paymentId
        ? 'Task completed successfully. Payment has been released to the freelancer.'
        : 'Task completed successfully.',
      task 
    });

  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ message: 'Failed to complete task' });
  }
});

// Delete task
router.delete('/:id', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const deletedTask = await Task.findOneAndDelete({
      _id: req.params.id,
      clientId: req.user._id,
      status: { $in: ['open', 'cancelled'] }
    });
    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found, not owned by you, or cannot be deleted in its current state' });
    }
    for (const attachment of deletedTask.attachments || []) {
      if (!mongoose.isValidObjectId(attachment.filename)) continue;
      try {
        await getTaskAttachmentsBucket().delete(new mongoose.Types.ObjectId(attachment.filename));
      } catch (cleanupError) {
        console.error('Failed to delete task document:', cleanupError);
      }
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

// Get task progress
router.get('/:id/progress', authMiddleware.authenticateUser, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user._id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user is the task owner or selected freelancer
    if (task.clientId.toString() !== userId.toString() && task.selectedFreelancerId?.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // For now, return default progress data
    // In a real app, you'd have a separate Progress model
    const progress = {
      progress: 0, // This would come from a Progress model
      milestonesCompleted: 0,
      totalMilestones: 0,
      daysRemaining: task.deadline ? Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
      updates: [] // This would come from messages or progress updates
    };

    res.json(progress);

  } catch (error) {
    console.error('Error fetching task progress:', error);
    res.status(500).json({ message: 'Failed to fetch task progress' });
  }
});

module.exports = router;
