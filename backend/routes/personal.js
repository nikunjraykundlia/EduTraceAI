const express = require('express');
const router = express.Router();
const { submitVideo, generateQuiz, generateSummaryAndDoubts, getVideo, getPersonalHistory, generateTranscript, deleteVideo } = require('../controllers/personal');
const { protect } = require('../middleware/auth');

router.post('/video', protect, submitVideo);
router.get('/history', protect, getPersonalHistory);
router.get('/video/:videoId', protect, getVideo);
router.post('/generate-quiz', protect, generateQuiz);
router.post('/generate-summary', protect, generateSummaryAndDoubts);
router.post('/generate-transcript', protect, generateTranscript);
router.delete('/video/:videoId', protect, deleteVideo);

module.exports = router;
