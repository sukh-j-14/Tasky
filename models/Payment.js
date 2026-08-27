const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Transaction Details
  transactionId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task', 
    required: true 
  },
  bidId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bid', 
    required: true 
  },
  
  // Parties involved
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  freelancerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Financial Details
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  platformFee: { 
    type: Number, 
    default: 0 
  },
  freelancerAmount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  
  // Payment Status
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'disputed'],
    default: 'pending'
  },
  
  // Payment Method
  paymentMethod: { 
    type: String, 
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'wallet'],
    required: true 
  },
  
  // Escrow System
  isEscrow: { 
    type: Boolean, 
    default: true 
  },
  escrowReleased: { 
    type: Boolean, 
    default: false 
  },
  escrowReleasedAt: Date,
  escrowReleasedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Milestone Payments
  isMilestonePayment: { 
    type: Boolean, 
    default: false 
  },
  milestoneId: String,
  milestoneTitle: String,
  
  // Dispute Information
  dispute: {
    isDisputed: { type: Boolean, default: false },
    disputedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    disputeReason: String,
    disputeDescription: String,
    disputedAt: Date,
    resolvedAt: Date,
    resolution: String
  },
  
  // Refund Information
  refund: {
    isRefunded: { type: Boolean, default: false },
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // External Payment Gateway
  gatewayTransactionId: String,
  gatewayResponse: mongoose.Schema.Types.Mixed,
  
  // Timestamps
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,
  
  // Notes
  notes: String,
  internalNotes: String
}, {
  timestamps: true
});

// Indexes for efficient queries
paymentSchema.index({ taskId: 1 });
paymentSchema.index({ clientId: 1 });
paymentSchema.index({ freelancerId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for client info
paymentSchema.virtual('client', {
  ref: 'User',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

// Virtual for freelancer info
paymentSchema.virtual('freelancer', {
  ref: 'User',
  localField: 'freelancerId',
  foreignField: '_id',
  justOne: true
});

// Virtual for task info
paymentSchema.virtual('task', {
  ref: 'Task',
  localField: 'taskId',
  foreignField: '_id',
  justOne: true
});

// Virtual for bid info
paymentSchema.virtual('bid', {
  ref: 'Bid',
  localField: 'bidId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
paymentSchema.set('toJSON', { virtuals: true });
paymentSchema.set('toObject', { virtuals: true });

// Pre-save middleware to calculate amounts
paymentSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('amount')) {
    // Calculate platform fee (5% of total amount)
    this.platformFee = Math.round(this.amount * 0.05 * 100) / 100;
    // Calculate freelancer amount
    this.freelancerAmount = this.amount - this.platformFee;
  }
  next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;


