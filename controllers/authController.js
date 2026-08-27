const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });
};

const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  isFreelancer: user.isFreelancer,
  skills: user.skills,
  rating: user.rating,
  profilePicture: user.profilePicture,
  walletBalance: user.walletBalance
});

// Signup
exports.signup = async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      isFreelancer = true, // Everyone can be both client and freelancer
      skills = [],
      hourlyRate,
      university,
      major
    } = req.body;
    
    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Missing required fields: username, email, password, firstName, lastName' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    const user = new User({ 
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password, 
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      isFreelancer,
      skills,
      hourlyRate,
      university,
      major
    });
    
    const token = user.generateAuthToken();
    await user.save();
    setAuthCookie(res, token);
    
    res.status(201).json({ 
      message: 'User created successfully',
      user: publicUser(user),
      token 
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(400).json({ error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    if (!user.isActive) {
      return res.status(400).json({ error: 'Account is deactivated' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = user.generateAuthToken();
    
    setAuthCookie(res, token);
    
    res.status(200).json({ 
      message: "Login successful", 
      user: publicUser(user),
      token 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.getGoogleConfig = (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google sign-in is not configured' });
  }
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID });
};

exports.googleAuth = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google sign-in is not configured' });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({ error: 'Google account email is not verified' });
    }

    const email = payload.email.trim().toLowerCase();
    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] }).select('+googleId');

    if (!user) {
      user = new User({
        username: `google_${payload.sub.slice(-16)}`,
        email,
        password: crypto.randomBytes(32).toString('hex'),
        firstName: payload.given_name || payload.name || 'Google',
        lastName: payload.family_name || '',
        profilePicture: payload.picture || '',
        googleId: payload.sub,
        isVerified: true,
        isFreelancer: true
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub;
      user.isVerified = true;
    }

    await user.save();
    const token = user.generateAuthToken();
    setAuthCookie(res, token);
    res.json({ message: 'Google sign-in successful', user: publicUser(user), token });
  } catch (error) {
    console.error('Google authentication error:', error.message);
    res.status(401).json({ error: 'Google sign-in could not be verified' });
  }
};
// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'bio', 'location', 'phone', 'university',
      'major', 'graduationYear', 'gpa', 'isFreelancer', 'skills', 'hourlyRate',
      'availability', 'portfolio', 'notifications', 'socialLinks'
    ];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
    );
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (process.env.VERCEL) {
      return res.status(503).json({
        message: 'Profile picture uploads are temporarily unavailable until persistent file storage is configured.'
      });
    }
    console.log('Upload request received:', req.file);
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture: `/uploads/${req.file.filename}` },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Profile picture updated for user:', user._id);
    
    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: user.profilePicture
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ message: 'Failed to upload profile picture: ' + error.message });
  }
};

exports.logout = (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
 
  res.clearCookie("token");
  res.status(200).json({ message: 'Logged out successfully' });
};

