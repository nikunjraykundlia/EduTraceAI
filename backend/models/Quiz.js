const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mode: { type: String, enum: ['personal', 'college'] },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date },
  timeLimit: { type: Number, default: 0 }, // minutes
  mcqs: [
    {
      question: String,
      options: [
        { label: String, text: String }
      ],
      correctAnswer: String,
      explanation: String,
      sourceTimestamp: {
        startTime: Number,
        endTime: Number,
        transcriptExcerpt: String
      },
      exacttimestamp: String,
      youtubevideotitle: String,
      confidence: String,
      difficulty: String,
      topic: String
    }
  ],
  shortAnswerQuestions: [
    {
      question: String,
      expectedAnswer: String,
      keywords: [String],
      sourceTimestamp: {
        startTime: Number,
        endTime: Number,
        transcriptExcerpt: String
      },
      maxMarks: { type: Number, default: 5 },
      topic: String
    }
  ],
  totalMCQs: { type: Number, default: 0 },
  totalSAQs: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
