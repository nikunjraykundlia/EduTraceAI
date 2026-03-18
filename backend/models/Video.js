const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  youtubeUrl: { type: String, required: true },
  youtubeVideoId: { type: String },
  title: { type: String },
  thumbnail: { type: String },
  duration: { type: Number }, // seconds
  audioUrl: { type: String }, // ImageKit URL for n8n processing
  transcript: {
    raw: { type: String },
    segments: [
      {
        text: { type: String },
        startTime: { type: Number },
        endTime: { type: Number }
      }
    ]
  },
  transcriptVerified: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', default: null },
  mode: { type: String, enum: ['personal', 'college'] },
  summary: {
    shortSummary: { type: String },
    detailedSummary: { type: String },
    keyTopics: [
      {
        topic: String,
        description: String,
        timestamp: { startTime: Number, endTime: Number }
      }
    ],
    keyTerms: [
      { term: String, definition: String }
    ],
    summaryCitation: {
      evidence: String,
      timestampRange: String,
      youtubeVideoTitle: String
    },
    doubts: { type: String },
    doubtsCitation: {
      evidence: String,
      timestampRange: String,
      youtubeVideoTitle: String
    },
    generatedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
