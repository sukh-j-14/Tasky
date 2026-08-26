const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewars/auth.middleware');
const multer = require('multer');
const path = require('path');

// Public auth routes
router.post('/signup', authMiddleware.rateLimit(10, 15 * 60 * 1000), authController.signup);
router.post('/login', authMiddleware.rateLimit(20, 15 * 60 * 1000), authController.login);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log('File filter check:', file.mimetype);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'), false)
    }
  }
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 2MB.' });
    }
  }
  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({ message: 'Only image files are allowed!' });
  }
  next(err);
};

// Protected routes
router.get('/profile', authMiddleware.authenticateUser, authController.getProfile);
router.put('/profile', authMiddleware.authenticateUser, authController.updateProfile);
router.post('/profile/upload', authMiddleware.authenticateUser, upload.single('profilePicture'), handleUploadError, authController.uploadProfilePicture);
router.post('/logout', authMiddleware.authenticateUser, authController.logout);

// Legacy user routes (protected)
router.get('/dashboard', authMiddleware.authenticateUser, userController.getDashboard);
router.get('/tasks', authMiddleware.authenticateUser, userController.getTasks);

module.exports = router;
