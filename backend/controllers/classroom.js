const Classroom = require('../models/Classroom');
const Video = require('../models/Video');
const Quiz = require('../models/Quiz');
const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');
const generateClassCode = require('../utils/classCodeGenerator');
const { fetchTranscript } = require('../services/transcriptService');
const { sendTranscriptToN8nAsync } = require('../services/n8nTranscriptionService');
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
    const populateOptions = [
      { path: 'students', select: 'name email avatar' },
      { path: 'videos' },
      { path: 'instructorId', select: 'name' }
    ];

    if (req.user.role === 'instructor') {
      populateOptions.push({ path: 'quizzes' });
    } else {
      populateOptions.push({ 
        path: 'quizzes', 
        match: { isPublished: true },
        select: '-mcqs.correctAnswer -mcqs.explanation -shortAnswerQuestions.expectedAnswer'
      });
    }

    const classroom = await Classroom.findById(req.params.classroomId)
      .populate(populateOptions);

    if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found' });
    
    // For students, also fetch their attempt status for each quiz
    let completedAttempts = [];
    if (req.user.role === 'student') {
      const QuizAttempt = require('../models/QuizAttempt');
      completedAttempts = await QuizAttempt.find({
        studentId: req.user.id,
        quizId: { $in: classroom.quizzes.map(q => q._id) },
        status: 'completed'
      }).select('quizId _id');
    }

    res.status(200).json({ success: true, classroom, completedAttempts });
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

    // Send transcript to n8n webhook for processing (fire-and-forget, don't wait)
    console.log(`[Classroom] Sending transcript to n8n for video: ${transcriptData.videoId}`);
    sendTranscriptToN8nAsync(transcriptData, youtubeUrl);

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
        session_id: video._id.toString(),
        videoId: video.youtubeVideoId,
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

    let rawMcqs = [];
    if (Array.isArray(n8nResponse) && n8nResponse[0]?.output?.mcqs) {
      rawMcqs = n8nResponse[0].output.mcqs;
    } else if (n8nResponse?.output?.mcqs) {
      rawMcqs = n8nResponse.output.mcqs;
    } else if (n8nResponse?.mcqs) {
      rawMcqs = n8nResponse.mcqs;
    }

    const transformedMcqs = rawMcqs.map(m => ({
      question: m.question,
      options: m.options ? Object.entries(m.options).map(([label, text]) => ({ label, text })) : [],
      correctAnswer: m.correctAnswer,
      explanation: m.explanation,
      exacttimestamp: m.citation?.timestamprange || '',
      youtubevideotitle: m.citation?.youtubevideotitle || '',
      confidence: m.confidence || 'High'
    }));

    const quiz = await Quiz.create({
      title: `${video.title} Quiz`,
      videoId: video._id,
      classroomId,
      createdBy: req.user.id,
      mode: 'college',
      difficulty,
      isPublished: false,
      mcqs: transformedMcqs,
      totalMCQs: transformedMcqs.length,
      totalSAQs: 0
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

// @desc    Delete quiz from classroom
// @route   DELETE /api/classroom/:classroomId/quiz/:quizId
// @access  Private/Instructor
exports.deleteQuiz = async (req, res) => {
  try {
    const { classroomId, quizId } = req.params;
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    if (quiz.createdBy.toString() !== req.user.id) {
       return res.status(403).json({ success: false, message: 'Not authorized to delete this quiz' });
    }
    const classroom = await Classroom.findById(classroomId);
    if (classroom) {
      classroom.quizzes = classroom.quizzes.filter(id => id.toString() !== quizId);
      await classroom.save();
    }
    await quiz.deleteOne();
    res.status(200).json({ success: true, message: 'Quiz deleted successfully' });
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
        select: '_id'
      });

    const classroomsWithStats = await Promise.all(classrooms.map(async (classDoc) => {
      const classroomObj = classDoc.toObject();
      const publishedQuizIds = classDoc.quizzes.map(q => q._id);

      const completedCount = await QuizAttempt.countDocuments({
        studentId: req.user.id,
        quizId: { $in: publishedQuizIds },
        status: 'completed'
      });

      classroomObj.stats = {
        totalPublished: publishedQuizIds.length,
        completed: completedCount,
        pending: publishedQuizIds.length - completedCount
      };

      return classroomObj;
    }));

    res.status(200).json({ success: true, classrooms: classroomsWithStats });
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
    const { classroomId } = req.params;
    
    // Fetch base data
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return res.status(404).json({ success: false, message: 'Classroom not found' });

    const totalStudents = classroom.students.length;
    const totalQuizzes = classroom.quizzes.length;

    // Fetch quiz attempts to calculate averages
    const attempts = await QuizAttempt.find({ classroomId, status: 'completed' });
    
    // Aggregation logic
    const totalAttempts = attempts.length;
    const averageClassScore = totalAttempts > 0 
      ? Math.round(attempts.reduce((sum, a) => sum + a.totalScore, 0) / totalAttempts)
      : 0;

    const completionRate = totalStudents > 0 && totalQuizzes > 0
      ? Math.round((totalAttempts / (totalStudents * totalQuizzes)) * 100)
      : 0;

    // Quiz-wise performance
    const quizzes = await Quiz.find({ classroomId });
    const quizAverages = quizzes.map(quiz => {
      const quizAttempts = attempts.filter(a => a.quizId.toString() === quiz._id.toString());
      return {
        label: quiz.title,
        avg: quizAttempts.length > 0 
          ? Math.round(quizAttempts.reduce((sum, a) => sum + a.totalScore, 0) / quizAttempts.length)
          : 0
      };
    });

    // Student performance breakdown
    const studentPerformance = await Promise.all(classroom.students.map(async (studentId) => {
      const student = await User.findById(studentId);
      const studentAttempts = attempts.filter(a => a.studentId.toString() === studentId.toString());
      
      return {
        name: student?.name || 'Unknown Student',
        completedQuizzes: studentAttempts.length,
        avgScore: studentAttempts.length > 0
          ? Math.round(studentAttempts.reduce((sum, a) => sum + a.totalScore, 0) / studentAttempts.length)
          : 0
      };
    }));

    res.status(200).json({
      success: true,
      analytics: {
        totalStudents,
        totalQuizzes,
        averageClassScore,
        completionRate: Math.min(completionRate, 100),
        quizAverages,
        studentPerformance,
        questionWiseAnalytics: [],
        weakTimestamps: []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a classroom
// @route   DELETE /api/classroom/:classroomId
// @access  Private/Instructor
exports.deleteClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.findById(req.params.classroomId);

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    // Check if the user is the instructor of this classroom
    if (classroom.instructorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this classroom' });
    }

    // Delete all quizzes, attempts, and videos associated with this classroom
    await Quiz.deleteMany({ classroomId: req.params.classroomId });
    await Video.deleteMany({ classroomId: req.params.classroomId });
    await QuizAttempt.deleteMany({ classroomId: req.params.classroomId });
    
    await classroom.deleteOne();

    res.status(200).json({ success: true, message: 'Classroom deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
