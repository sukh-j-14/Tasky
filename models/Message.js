const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation Details
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation',
    required: true 
  },
  
  // Message Details
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Message Content
  message: { 
    type: String, 
    required: true,
    maxlength: 2000 
  },
  messageType: { 
    type: String, 
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  
  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Message Status
  isRead: { 
    type: Boolean, 
    default: false 
  },
  readAt: Date,
  
  // System Messages
  isSystemMessage: { 
    type: Boolean, 
    default: false 
  },
  systemMessageType: { 
    type: String, 
    enum: ['bid_accepted', 'bid_rejected', 'payment_received', 'task_completed', 'milestone_achieved', 'dispute_opened', 'dispute_resolved']
  },
  
  // Message Actions
  actions: [{
    type: { 
      type: String, 
      enum: ['like', 'dislike', 'report', 'forward'] 
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Reply/Thread
  replyTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Message' 
  },
  isReply: { 
    type: Boolean, 
    default: false 
  },
  
  // Message Priority
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Deletion
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  deletedAt: Date,
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Edit History
  isEdited: { 
    type: Boolean, 
    default: false 
  },
  editedAt: Date,
  editHistory: [{
    originalMessage: String,
    editedAt: Date
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ receiverId: 1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ createdAt: -1 });

// Virtual for sender info
messageSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true
});

// Virtual for receiver info
messageSchema.virtual('receiver', {
  ref: 'User',
  localField: 'receiverId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

const Message = mongoose.model('Message', messageSchema);

// Conversation Schema
const conversationSchema = new mongoose.Schema({
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  }],
  
  // Related entities
  taskId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task' 
  },
  bidId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bid' 
  },
  
  // Conversation metadata
  title: String,
  lastMessage: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Message' 
  },
  lastMessageAt: Date,
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isArchived: { 
    type: Boolean, 
    default: false 
  },
  
  // Unread counts per user
  unreadCounts: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 }
  }],
  
  // Conversation settings
  settings: {
    allowFileSharing: { type: Boolean, default: true },
    allowVoiceMessages: { type: Boolean, default: false },
    muteNotifications: { type: Boolean, default: false }
  },
  
  // User-specific deletion tracking
  deletedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ taskId: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = { Message, Conversation };


