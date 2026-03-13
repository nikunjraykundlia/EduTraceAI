const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateAdvancedTranscript } = require('../controllers/transcriptionController');

// @route   POST /api/transcription/advanced
// @desc    Generate transcript using yt-dlp and n8n
// @access  Private
router.post('/advanced', protect, generateAdvancedTranscript);

module.exports = router;
