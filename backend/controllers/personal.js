const Video = require('../models/Video');
const { fetchTranscript } = require('../services/transcriptService');
const n8nService = require('../services/n8nService');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const crypto = require('crypto');
const { triggerQuizWebhook } = require('../services/n8nQuizService');

exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    // If transcript segments are empty, try to find from another video with same youtubeVideoId
    if ((!video.transcript?.segments || video.transcript.segments.length === 0) && video.youtubeVideoId) {
      const siblingVideo = await Video.findOne({
        youtubeVideoId: video.youtubeVideoId,
        _id: { $ne: video._id },
        'transcript.segments.0': { $exists: true } // has at least one segment
      });

      if (siblingVideo) {
        video.transcript = siblingVideo.transcript;
        await video.save();
        console.log(`[getVideo] Copied transcript from sibling video ${siblingVideo._id} to ${video._id}`);
      }
    }

    // Fetch quiz history for this video, including attempt status
    const quizzes = await Quiz.find({ videoId: video._id, createdBy: req.user.id })
      .select('title createdAt difficulty totalMCQs isPublished')
      .sort({ createdAt: -1 })
      .lean();

    // Attach completion status to each quiz
    for (const q of quizzes) {
      const completedAttempt = await QuizAttempt.findOne({
        quizId: q._id,
        studentId: req.user.id,
        status: 'completed'
      }).select('_id').lean();
      q.isCompleted = !!completedAttempt;
      q.completedAttemptId = completedAttempt?._id || null;
    }

    res.status(200).json({ 
      success: true, 
      video,
      quizzes
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

    // 5. Extract questions (highly flexible parsing)
    let questions = [];
    
    console.log(`[Personal Quiz] Raw n8n response:`, JSON.stringify(n8nResponse).substring(0, 500));

    if (typeof n8nResponse === 'string') {
      try { n8nResponse = JSON.parse(n8nResponse); } catch(e) { /* ignore */ }
    }

    const extractFromItem = (item) => {
      if (!item) return [];
      if (item.question || item.Question) return [item];
      return item.mcqs || item.questions || item.items || (item.output ? (item.output.mcqs || item.output.questions || item.output) : []) || [];
    };

    if (Array.isArray(n8nResponse)) {
      // It's an array - could be an array of questions OR an array of n8n execution items
      // Check if first item is a question
      if (n8nResponse.length > 0 && (n8nResponse[0].question || n8nResponse[0].Question)) {
        questions = n8nResponse;
      } else {
        // Try to collect from all items
        n8nResponse.forEach(item => {
          const found = extractFromItem(item);
          if (Array.isArray(found)) questions = questions.concat(found);
          else if (found && typeof found === 'object' && found.question) questions.push(found);
        });
      }
    } else if (n8nResponse && typeof n8nResponse === 'object') {
      questions = extractFromItem(n8nResponse);
    }

    // Ensure we have an array
    if (!Array.isArray(questions)) questions = questions ? [questions] : [];
    
    console.log(`[Personal Quiz] Extracted ${questions.length} questions.`);

    // Map questions to match Quiz schema
    const mcqs = questions.filter(q => q && (q.question || q.Question)).map(q => {
      // Handle options if they are an object { A: '...', B: '...' }
      let formattedOptions = [];
      const opts = q.options || q.Options || q.choices || q.Choices;

      if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
        formattedOptions = Object.entries(opts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([label, text]) => ({
            label: label.toUpperCase(),
            text: text
          }));
      } else {
        // Fallback for array or sequence of properties
        formattedOptions = (Array.isArray(opts) ? opts : [q.option1, q.option2, q.option3, q.option4, q.a, q.b, q.c, q.d])
          .filter(Boolean)
          .map((opt, idx) => ({
            label: typeof opt === 'object' && opt.label ? opt.label : String.fromCharCode(65 + idx),
            text: typeof opt === 'object' ? opt.text : opt
          }));
      }

      return {
        question: q.question || q.Question || q.text,
        options: formattedOptions,
        correctAnswer: q.correctAnswer || q.CorrectAnswer || q.answer || 'A',
        explanation: q.explanation || q.Explanation || ''
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

exports.generateTranscript = async (req, res) => {
  try {
    const { videoId } = req.body;
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    console.log(`[Transcript] Fetching transcript for video: ${videoId}, URL: ${video.youtubeUrl}`);
    const transcriptData = await fetchTranscript(video.youtubeUrl);

    video.transcript = {
      raw: transcriptData.raw,
      segments: transcriptData.segments
    };
    video.youtubeVideoId = transcriptData.videoId; // Ensure ID is sync'd
    await video.save();

    res.status(200).json({ 
      success: true, 
      transcript: video.transcript,
      message: 'Transcript generated successfully.'
    });
  } catch (error) {
    console.error(`[Transcript] Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
