const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { startQuizAttempt, submitQuizAttempt, getQuizResults, downloadQuizPDF, generateQuizImagePDF } = require('../controllers/quiz');

router.post('/:quizId/start', protect, startQuizAttempt);
router.post('/:quizId/submit', protect, submitQuizAttempt);
router.get('/:quizId/results/:attemptId', protect, getQuizResults);
router.get('/:quizId/download/:attemptId', protect, downloadQuizPDF);
router.post('/:quizId/report-pdf/:attemptId', protect, generateQuizImagePDF);

module.exports = router;
