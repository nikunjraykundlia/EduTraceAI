const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateAdvancedTranscript, downloadTranscriptPDF } = require('../controllers/transcriptionController');

// @route   POST /api/transcription/advanced
// @desc    Generate transcript using yt-dlp and n8n
// @access  Private
router.post('/advanced', protect, generateAdvancedTranscript);

// @route   POST /api/transcription/download
// @desc    Download transcript as PDF
// @access  Private
router.post('/download', protect, downloadTranscriptPDF);

module.exports = router;
