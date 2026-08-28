const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task', 
    required: true 
  },
  bidderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  message: { 
    type: String, 
    required: true,
    maxlength: 1000 
  },
  proposedTimeline: { 
    type: Number, 
    required: true,
    min: 1 // in days
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  
  // Additional bid details
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Communication
  messages: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // Price negotiation history. Only one offer may be pending at a time.
  counterOffers: [{
    amount: { type: Number, required: true, min: 1 },
    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'countered'],
      default: 'pending'
    },
    createdAt: { type: Date, default: Date.now },
    respondedAt: Date
  }],
  negotiationStatus: {
    type: String,
    enum: ['none', 'negotiating', 'agreed'],
    default: 'none'
  },
  agreedAmount: { type: Number, min: 1 },
  
  // Timeline tracking
  milestones: [{
    title: String,
    description: String,
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  
  // Acceptance details
  acceptedAt: Date,
  rejectedAt: Date,
  withdrawnAt: Date,
  
  // Revision requests
  revisionRequests: [{
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    requestedAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'rejected'],
      default: 'pending'
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
bidSchema.index({ taskId: 1, bidderId: 1 });
bidSchema.index({ status: 1 });
bidSchema.index({ createdAt: -1 });

// Virtual for bidder info
bidSchema.virtual('bidder', {
  ref: 'User',
  localField: 'bidderId',
  foreignField: '_id',
  justOne: true
});

// Virtual for task info
bidSchema.virtual('task', {
  ref: 'Task',
  localField: 'taskId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
bidSchema.set('toJSON', { virtuals: true });
bidSchema.set('toObject', { virtuals: true });

const Bid = mongoose.model('Bid', bidSchema);

module.exports = Bid;

