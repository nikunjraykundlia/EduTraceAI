const Video = require('../models/Video');
const { fetchTranscript } = require('../services/transcriptService');
const n8nService = require('../services/n8nService');
const Quiz = require('../models/Quiz');
const crypto = require('crypto');
const { triggerQuizWebhook } = require('../services/n8nQuizService');

exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    // Fetch quiz history for this video
    const quizzes = await Quiz.find({ videoId: video._id, createdBy: req.user.id })
      .select('title createdAt difficulty totalMCQs isPublished')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      video,
      quizzes // Include existing quizzes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitVideo = async (req, res) => {
  try {
    const { youtubeUrl, transcript, audioUrl } = req.body;

    let transcriptData;

    // If transcript is provided in body (from advanced pipeline), use it
    if (transcript) {
      console.log('Using pre-extracted transcript from request body');
      transcriptData = typeof transcript === 'string' ? { raw: transcript, segments: [] } : transcript;

      // Helper to get videoId if not present
      if (!transcriptData.videoId) {
        const { extractVideoId } = require('../services/transcriptService');
        transcriptData.videoId = extractVideoId(youtubeUrl);
      }
    } else {
      // Fallback to basic transcript fetch
      try {
        transcriptData = await fetchTranscript(youtubeUrl);
      } catch (e) {
        return res.status(400).json({ success: false, error: 'TRANSCRIPT_NOT_AVAILABLE', message: e.message });
      }
    }

    // Save Video entry
    const video = await Video.create({
      youtubeUrl,
      youtubeVideoId: transcriptData.videoId || (youtubeUrl.includes('v=') ? youtubeUrl.split('v=')[1].split('&')[0] : youtubeUrl.split('/').pop()),
      title: 'YouTube Video',
      thumbnail: `https://img.youtube.com/vi/${transcriptData.videoId}/default.jpg`,
      transcript: {
        raw: transcriptData.raw || transcriptData,
        segments: transcriptData.segments || []
      },
      uploadedBy: req.user.id,
      mode: 'personal',
      audioUrl: audioUrl
    });

    res.status(200).json({
      success: true,
      video,
      message: 'Video added successfully.'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.generateQuiz = async (req, res) => {
  try {
    const { videoId, numMCQs = 10, numSAQs = 5, difficulty = 'medium' } = req.body;

    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    // Call n8n to generate quiz using triggerQuizWebhook
    let n8nResponse;
    const sessionId = crypto.randomUUID();
    try {
      console.log(`[Personal Quiz] Triggering webhook for video: ${videoId}, audioUrl: ${video.audioUrl}`);
      n8nResponse = await triggerQuizWebhook(sessionId, video.audioUrl || video.youtubeUrl);
    } catch (err) {
      return res.status(504).json({ success: false, error: 'AI_PROCESSING_TIMEOUT', message: err.message });
    }

    // 5. Extract questions (flexible parsing to match n8n response)
    let questions = [];
    if (Array.isArray(n8nResponse) && n8nResponse[0] && n8nResponse[0].output && n8nResponse[0].output.mcqs) {
      questions = n8nResponse[0].output.mcqs;
    } else if (Array.isArray(n8nResponse)) {
      questions = n8nResponse;
    } else if (n8nResponse && typeof n8nResponse === 'object') {
      questions = n8nResponse.questions || n8nResponse.data || n8nResponse.mcqs || (n8nResponse.output ? n8nResponse.output.mcqs : []) || [];
    }

    // Map questions to match Quiz schema
    const mcqs = questions.map(q => {
      // Handle options if they are an object { A: '...', B: '...' }
      let formattedOptions = [];
      if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
        // Sort keys to ensure A, B, C, D order if possible, though Object.entries usually follows insertion order
        formattedOptions = Object.entries(q.options)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([label, text]) => ({
            label: label.toUpperCase(),
            text: text
          }));
      } else {
        formattedOptions = (q.options || q.Options || [q.option1, q.option2, q.option3, q.option4] || [])
          .filter(Boolean)
          .map((opt, idx) => ({
            label: String.fromCharCode(65 + idx), // A, B, C, D
            text: typeof opt === 'string' ? opt : (opt.text || JSON.stringify(opt))
          }));
      }

      return {
        question: q.question || q.Question || q.text,
        options: formattedOptions,
        correctAnswer: q.correctAnswer || q.CorrectAnswer || 'A',
        explanation: q.explanation || ''
      };
    });

    const quiz = await Quiz.create({
      title: `${video.title} Quiz`,
      videoId: video._id,
      createdBy: req.user.id,
      mode: 'personal',
      difficulty,
      isPublished: true,
      mcqs: mcqs,
      totalMCQs: mcqs.length,
      totalSAQs: 0
    });

    res.status(200).json({ success: true, quiz });
  } catch (error) {
    console.error(`[Personal Quiz] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.generateSummary = async (req, res) => {
  try {
    const { videoId } = req.body;
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    let n8nResponse;
    try {
      n8nResponse = await n8nService.generateSummary({
        transcript: video.transcript.raw,
        video_id: video._id.toString(),
        video_title: video.title
      });
    } catch (err) {
      return res.status(504).json({ success: false, error: 'AI_PROCESSING_TIMEOUT', message: err.message });
    }

    if (n8nResponse) {
      // Map n8n response to Video.summary schema
      video.summary = {
        shortSummary: n8nResponse.shortSummary || n8nResponse.summary?.shortSummary || n8nResponse.summary || '',
        detailedSummary: n8nResponse.detailedSummary || n8nResponse.summary?.detailedSummary || '',
        keyTopics: n8nResponse.keyTopics || n8nResponse.summary?.keyTopics || [],
        keyTerms: n8nResponse.keyTerms || n8nResponse.summary?.keyTerms || [],
        generatedAt: new Date()
      };
      await video.save();
    }

    res.status(200).json({ success: true, summary: video.summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPersonalHistory = async (req, res) => {
  try {
    const videos = await Video.find({ uploadedBy: req.user.id, mode: 'personal' })
      .select('title youtubeVideoId thumbnail createdAt')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, videos });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
