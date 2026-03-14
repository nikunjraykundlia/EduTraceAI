const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateQuiz } = require('../controllers/test');

// @route   POST /api/test/generate
// @desc    Generate MCQ quiz from a YouTube URL via n8n pipeline
// @access  Private
router.post('/generate', protect, generateQuiz);

module.exports = router;
