const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    required: true,
    enum: ['assignment', 'lab-report', 'research-paper', 'presentation', 'coding', 'design', 'writing', 'translation', 'data-analysis', 'other']
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // Client Information
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  email: {
    type: String,
    required: true
  },
  contactName: {
    type: String,
    required: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String
  },
  contactMethod: {
    type: String,
    required: true,
    enum: ['email', 'phone', 'both']
  },
  
  // Task Details
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  budgetType: {
    type: String,
    enum: ['fixed', 'hourly'],
    default: 'fixed'
  },
  hourlyRate: {
    type: Number,
    min: 0
  },
  estimatedHours: {
    type: Number,
    min: 1
  },
  
  // Timeline
  deadline: {
    type: Date,
    required: true
  },
  startDate: Date,
  estimatedDuration: {
    type: Number, // in days
    min: 1
  },
  
  // Requirements
  skills: [{ type: String }],
  experienceLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate'
  },
  requirements: [{
    type: String,
    enum: ['portfolio', 'certification', 'experience', 'education', 'test']
  }],
  
  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Status and Progress
  status: {
    type: String,
    default: 'open',
    enum: ['open', 'in-progress', 'completed', 'cancelled', 'disputed', 'closed']
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Bidding
  biddingType: {
    type: String,
    enum: ['open', 'invite-only', 'direct-hire'],
    default: 'open'
  },
  maxBids: {
    type: Number,
    default: 50
  },
  currentBidCount: {
    type: Number,
    default: 0
  },
  biddingEndsAt: Date,
  
  // Selected Freelancer
  selectedBidId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bid' 
  },
  selectedFreelancerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  selectedAt: Date,
  
  // Milestones
  milestones: [{
    title: String,
    description: String,
    dueDate: Date,
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'rejected'],
      default: 'pending'
    },
    completedAt: Date,
    approvedAt: Date
  }],
  
  // Quality and Reviews
  qualityRating: {
    type: Number,
    min: 1,
    max: 5
  },
  qualityReview: String,
  qualityReviewedAt: Date,
  
  // Visibility and Privacy
  isPublic: {
    type: Boolean,
    default: true
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  applications: {
    type: Number,
    default: 0
  },
  
  // Completion
  completedAt: Date,
  deliveredAt: Date,
  acceptedAt: Date,
  
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
  
  // Tags for search
  tags: [{ type: String }],
  
  // Location (if applicable)
  location: {
    type: String,
    enum: ['remote', 'onsite', 'hybrid']
  },
  country: String,
  city: String,
  
  // Language requirements
  language: {
    type: String,
    default: 'English'
  },
  
  // Additional metadata
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes for efficient queries
taskSchema.index({ clientId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ budget: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ isPublic: 1, status: 1 });
taskSchema.index({ skills: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ location: 1 });

// Text search index
taskSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text' 
});

// Virtual for client info
taskSchema.virtual('client', {
  ref: 'User',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

// Virtual for selected freelancer info
taskSchema.virtual('selectedFreelancer', {
  ref: 'User',
  localField: 'selectedFreelancerId',
  foreignField: '_id',
  justOne: true
});

// Virtual for selected bid info
taskSchema.virtual('selectedBid', {
  ref: 'Bid',
  localField: 'selectedBidId',
  foreignField: '_id',
  justOne: true
});

// Virtual for time remaining
taskSchema.virtual('timeRemaining').get(function() {
  if (this.deadline) {
    const now = new Date();
    const timeDiff = this.deadline.getTime() - now.getTime();
    return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24))); // days
  }
  return null;
});

// Virtual for budget range
taskSchema.virtual('budgetRange').get(function() {
  if (this.budgetType === 'hourly' && this.estimatedHours) {
    const minBudget = this.hourlyRate * this.estimatedHours;
    const maxBudget = this.hourlyRate * this.estimatedHours * 1.5;
    return { min: minBudget, max: maxBudget };
  }
  return { min: this.budget, max: this.budget };
});

// Ensure virtual fields are serialized
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

// Pre-save middleware
taskSchema.pre('save', function(next) {
  // Auto-generate tags from title and description
  if (this.isModified('title') || this.isModified('description')) {
    const text = `${this.title} ${this.description}`.toLowerCase();
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    const words = text.split(/\W+/).filter(word => 
      word.length > 3 && !commonWords.includes(word)
    );
    this.tags = [...new Set(words)].slice(0, 10); // Max 10 tags
  }
  
  // Set bidding end date if not set
  if (!this.biddingEndsAt && this.biddingType === 'open') {
    this.biddingEndsAt = new Date(this.deadline.getTime() - (24 * 60 * 60 * 1000)); // 1 day before deadline
  }
  
  next();
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;