const express = require('express');
const router = express.Router();
const { uploadMiddleware } = require('../config/upload');

// @desc    Upload image
// @route   POST /api/upload/image
// @access  Private (or public depending on needs)
router.post('/image', uploadMiddleware, (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  res.json({
    success: true,
    imageUrl: req.file.path,
    publicId: req.file.filename
  });
});

module.exports = router;