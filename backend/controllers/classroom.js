const Classroom = require('../models/Classroom');
const Video = require('../models/Video');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const generateClassCode = require('../utils/classCodeGenerator');
const { fetchTranscript } = require('../services/transcriptService');
const n8nService = require('../services/n8nService');

// @desc    Create a new classroom
// @route   POST /api/classroom/create
// @access  Private/Instructor
exports.createClassroom = async (req, res) => {
  try {
    const { name, description } = req.body;

    let classCode = generateClassCode();
    let isUnique = false;
    
    while (!isUnique) {
      const existing = await Classroom.findOne({ classCode });
      if (!existing) isUnique = true;
      else classCode = generateClassCode();
    }

    const classroom = await Classroom.create({
      name,
      description,
      instructorId: req.user.id,
      classCode
    });

    res.status(201).json({ success: true, classroom });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all classes for an instructor
// @route   GET /api/classroom/instructor/my-classes
// @access  Private/Instructor
exports.getInstructorClasses = async (req, res) => {
  try {
    const classrooms = await Classroom.find({ instructorId: req.user.id });
    res.status(200).json({ success: true, classrooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Student joins a classroom
// @route   POST /api/classroom/join
// @access  Private/Student
exports.joinClassroom = async (req, res) => {
  try {
    const { classCode } = req.body;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can join classrooms.' });
    }

    let classroom = await Classroom.findOne({ classCode });

    if (!classroom) {
      return res.status(404).json({ success: false, error: 'INVALID_CLASS_CODE', message: 'No classroom found with this code.' });
    }

    if (classroom.students.includes(req.user.id)) {
      return res.status(400).json({ success: false, error: 'ALREADY_JOINED', message: 'You are already a member of this classroom.' });
    }

    classroom.students.push(req.user.id);
    await classroom.save();

    // Populate for the frontend
    await classroom.populate('instructorId', 'name');
    await classroom.populate({
      path: 'quizzes',
      match: { isPublished: true },
      select: '-mcqs.correctAnswer -mcqs.explanation -shortAnswerQuestions.expectedAnswer'
    });

    res.status(200).json({ success: true, classroom });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get classroom by ID
// @route   GET /api/classroom/:classroomId
// @access  Private
exports.getClassroomById = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.classroomId)
      .populate('students', 'name email avatar')
      .populate('videos')
      .populate('quizzes');

    if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found' });
    res.status(200).json({ success: true, classroom });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add video to classroom
// @route   POST /api/classroom/:classroomId/video
// @access  Private/Instructor
exports.addVideoToClassroom = async (req, res) => {
  try {
    const { youtubeUrl } = req.body;
    const classroomId = req.params.classroomId;

    let transcriptData = await fetchTranscript(youtubeUrl);

    const video = await Video.create({
      youtubeUrl,
      youtubeVideoId: transcriptData.videoId,
      title: 'Classroom Video',
      thumbnail: `https://img.youtube.com/vi/${transcriptData.videoId}/default.jpg`,
      transcript: { raw: transcriptData.raw, segments: transcriptData.segments },
      uploadedBy: req.user.id,
      classroomId,
      mode: 'college'
    });

    const classroom = await Classroom.findById(classroomId);
    classroom.videos.push(video._id);
    await classroom.save();

    res.status(200).json({ success: true, video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify/edit transcript
// @route   PUT /api/classroom/:classroomId/video/:videoId/transcript
// @access  Private/Instructor
exports.verifyTranscript = async (req, res) => {
  try {
    const { segments, verified } = req.body;
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    // Combine segments into raw text
    video.transcript.segments = segments;
    video.transcript.raw = segments.map(s => s.text).join(' ');
    video.transcriptVerified = verified !== undefined ? verified : true;
    await video.save();

    res.status(200).json({ success: true, video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate quiz for classroom
// @route   POST /api/classroom/:classroomId/generate-quiz
// @access  Private/Instructor
exports.generateClassroomQuiz = async (req, res) => {
  try {
    const { videoId, numMCQs = 10, numSAQs = 5, difficulty = 'medium' } = req.body;
    const { classroomId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    let n8nResponse;
    try {
      n8nResponse = await n8nService.generateQuiz({
        transcript: video.transcript.raw,
        video_id: video._id.toString(),
        video_title: video.title,
        num_mcqs: numMCQs,
        num_saqs: numSAQs,
        difficulty
      });
    } catch (err) {
      return res.status(504).json({ success: false, error: 'AI_PROCESSING_TIMEOUT', message: err.message });
    }

    const quizData = n8nResponse?.mcqs ? n8nResponse : {
      title: `${video.title} Quiz`,
      videoId: video._id,
      createdBy: req.user.id,
      mode: 'college',
      difficulty,
      isPublished: false, // Instructor must explicitly publish
      mcqs: [],
      shortAnswerQuestions: [],
      totalMCQs: 0,
      totalSAQs: 0
    };

    const quiz = await Quiz.create({
      ...quizData,
      videoId: video._id,
      classroomId,
      createdBy: req.user.id,
      mode: 'college',
      isPublished: false
    });

    const classroom = await Classroom.findById(classroomId);
    classroom.quizzes.push(quiz._id);
    await classroom.save();

    res.status(200).json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Publish quiz
// @route   PUT /api/classroom/:classroomId/quiz/:quizId/publish
// @access  Private/Instructor
exports.publishQuiz = async (req, res) => {
  try {
    const { timeLimit } = req.body;
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    quiz.isPublished = true;
    quiz.publishedAt = new Date();
    if (timeLimit) quiz.timeLimit = timeLimit;

    await quiz.save();
    res.status(200).json({ success: true, quiz });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all classes for a student
// @route   GET /api/classroom/student/my-classes
// @access  Private/Student
exports.getStudentClasses = async (req, res) => {
  try {
    const classrooms = await Classroom.find({ students: req.user.id })
      .populate('instructorId', 'name')
      .populate({
        path: 'quizzes',
        match: { isPublished: true },
        select: '-mcqs.correctAnswer -mcqs.explanation -shortAnswerQuestions.expectedAnswer' // Hide answers
      });
    res.status(200).json({ success: true, classrooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get published quizzes for a class (Student view)
// @route   GET /api/classroom/:classroomId/quizzes
// @access  Private
exports.getClassroomQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ classroomId: req.params.classroomId, isPublished: true })
      .select('-mcqs.correctAnswer -mcqs.explanation -shortAnswerQuestions.expectedAnswer');
    res.status(200).json({ success: true, quizzes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get classroom analytics
// @route   GET /api/classroom/:classroomId/analytics
// @access  Private/Instructor
exports.getClassroomAnalytics = async (req, res) => {
  try {
    // Basic mock implementation for analytics. Real implementation would aggregate QuizAttempts
    res.status(200).json({
      success: true,
      analytics: {
        totalStudents: 0,
        totalQuizzes: 0,
        averageClassScore: 0,
        studentPerformance: [],
        questionWiseAnalytics: [],
        weakTimestamps: []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
