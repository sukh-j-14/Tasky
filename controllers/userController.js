const User = require('../models/User');
const Task = require('../models/Task'); // Assuming you have a Task model
const authMiddleware = require('../middlewars/auth.middleware')

// Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({ message: 'Welcome to your dashboard', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Tasks
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};