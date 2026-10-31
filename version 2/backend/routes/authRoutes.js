const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewars/auth.middleware');
const multer = require('multer');
const path = require('path');
const os = require('os');

// Public auth routes
router.post('/signup', authMiddleware.rateLimit(10, 15 * 60 * 1000), authController.signup);
router.post('/login', authMiddleware.rateLimit(20, 15 * 60 * 1000), authController.login);
router.get('/google/config', authController.getGoogleConfig);
router.post('/google', authMiddleware.rateLimit(20, 15 * 60 * 1000), authController.googleAuth);

// Configure multer for file uploads
const upload = multer({
 storage: multer.memoryStorage(), limits: {fileSize: 2 * 1024 * 1024, files: 1},
 fileFilter: (_req,file,cb) => cb(null, ['image/jpeg','image/png'].includes(file.mimetype))
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


