const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken")

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 8, select: false },
  
  // Profile Information
  firstName: { type: String, required: false, default: '' },
  lastName: { type: String, required: false, default: '' },
  profilePicture: { type: String, default: '' },
  bio: { type: String, maxlength: 500 },
  location: { type: String },
  phone: { type: String },
  
  // Academic Information
  university: { type: String },
  major: { type: String },
  graduationYear: { type: Number },
  gpa: { type: Number, min: 0, max: 4.0 },
  
  // Freelancer Profile
  isFreelancer: { type: Boolean, default: false },
  skills: [{ type: String }],
  hourlyRate: { type: Number, min: 0 },
  availability: { 
    type: String, 
    enum: ['available', 'busy', 'unavailable'],
    default: 'available'
  },
  
  // Portfolio
  portfolio: [{
    title: String,
    description: String,
    imageUrl: String,
    projectUrl: String,
    category: String
  }],
  
  // Ratings and Reviews
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  reviews: [{
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Financial Information
  totalEarnings: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  
  // Statistics
  tasksCompleted: { type: Number, default: 0 },
  tasksPosted: { type: Number, default: 0 },
  successRate: { type: Number, default: 0 },
  
  // Account Status
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastActive: { type: Date, default: Date.now },
  
  // Preferences
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false }
  },
  
  // Social Links
  socialLinks: {
    linkedin: String,
    github: String,
    website: String
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ 
        userId: this._id,
        email: this.email 
    }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
};


module.exports = mongoose.model('User', userSchema);
