const express = require('express');
const router = express.Router();
const { protect, instructorAuth } = require('../middleware/auth');
const {
  createClassroom,
  getInstructorClasses,
  joinClassroom,
  getClassroomById,
  addVideoToClassroom,
  verifyTranscript,
  generateClassroomQuiz,
  publishQuiz,
  getStudentClasses,
  getClassroomQuizzes,
  getClassroomAnalytics,
  deleteQuiz,
  deleteClassroom
} = require('../controllers/classroom');

// Instructor routes
router.post('/create', protect, instructorAuth, createClassroom);
router.get('/instructor/my-classes', protect, instructorAuth, getInstructorClasses);
router.post('/:classroomId/video', protect, instructorAuth, addVideoToClassroom);
router.put('/:classroomId/video/:videoId/transcript', protect, instructorAuth, verifyTranscript);
router.post('/:classroomId/generate-quiz', protect, instructorAuth, generateClassroomQuiz);
router.put('/:classroomId/quiz/:quizId/publish', protect, instructorAuth, publishQuiz);
router.delete('/:classroomId/quiz/:quizId', protect, instructorAuth, deleteQuiz);
router.get('/:classroomId/analytics', protect, instructorAuth, getClassroomAnalytics);
router.delete('/:classroomId', protect, instructorAuth, deleteClassroom);

// Student routes
router.post('/join', protect, joinClassroom);
router.get('/student/my-classes', protect, getStudentClasses);
router.get('/:classroomId/quizzes', protect, getClassroomQuizzes);

// General route
router.get('/:classroomId', protect, getClassroomById);

module.exports = router;
