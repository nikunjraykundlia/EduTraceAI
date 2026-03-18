const Video = require('../models/Video');
const { fetchTranscript, parseTranscriptSegments } = require('../services/transcriptService');
const n8nService = require('../services/n8nService');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const crypto = require('crypto');
const { triggerQuizWebhook } = require('../services/n8nQuizService');
const { sendTranscriptToN8nAsync } = require('../services/n8nTranscriptionService');

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
      
      if (typeof transcript === 'string') {
        transcriptData = {
          raw: transcript,
          segments: parseTranscriptSegments(transcript)
        };
      } else {
        transcriptData = transcript;
        // If segments are missing but we have raw text, parse it
        if ((!transcriptData.segments || transcriptData.segments.length === 0) && (transcriptData.raw || transcriptData.timestampedTranscript)) {
          transcriptData.segments = parseTranscriptSegments(transcriptData.raw || transcriptData.timestampedTranscript);
        }
      }

      // Helper to get videoId if not present
      if (!transcriptData.videoId) {
        const { extractVideoId } = require('../services/transcriptService');
        transcriptData.videoId = extractVideoId(youtubeUrl);
      }
    } else {
      // Fallback to basic transcript fetch using the new youtube-transcript-plus
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
      title: transcriptData.title || 'YouTube Video',
      thumbnail: `https://img.youtube.com/vi/${transcriptData.videoId}/default.jpg`,
      transcript: {
        raw: transcriptData.raw || transcriptData,
        segments: transcriptData.segments || []
      },
      uploadedBy: req.user.id,
      mode: 'personal',
      audioUrl: null
    });

    // Send transcript to n8n webhook for processing (fire-and-forget, don't wait)
    console.log(`[Personal] Sending transcript to n8n for video: ${video._id}`);
    sendTranscriptToN8nAsync(transcriptData, youtubeUrl);

    res.status(200).json({
      success: true,
      video,
      message: 'Video added successfully with transcript.'
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

    // Call n8n to generate quiz using transcript data
    let n8nResponse;
    const sessionId = crypto.randomUUID();
    try {
      if (!video.transcript?.segments || video.transcript.segments.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'TRANSCRIPT_NOT_AVAILABLE',
          message: 'Video transcript is not available. Please generate transcript first.' 
        });
      }

      console.log(`[Personal Quiz] Triggering webhook for video: ${videoId}`);
      n8nResponse = await triggerQuizWebhook(sessionId, video.youtubeVideoId);
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
      // Debug: Log the raw question data
      console.log(`[Quiz Generation] Raw question data:`, JSON.stringify(q, null, 2));
      
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

      // Debug: Log citation data to understand the structure
      console.log(`[Quiz Generation] Citation data:`, JSON.stringify(q.citation, null, 2));
      
      const processedMcq = {
        question: q.question || q.Question || q.text,
        options: formattedOptions,
        correctAnswer: q.correctAnswer || q.CorrectAnswer || q.answer || 'A',
        explanation: q.explanation || q.Explanation || '',
        exacttimestamp: q.citation?.timestamprange || q.exacttimestamp || q.exactTimestamp || q.timestamp || '',
        youtubevideotitle: q.citation?.youtubevideotitle || q.youtubevideotitle || q.youtubeVideoTitle || video.title || 'A Brief History of AI',
        confidence: q.confidence || q.Confidence || ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
        sourceTimestamp: q.sourceTimestamp || {
          startTime: q.startTime || 0,
          endTime: q.endTime || 0,
          transcriptExcerpt: q.transcriptExcerpt || ''
        }
      };
      
      // Debug: Log the processed MCQ data
      console.log(`[Quiz Generation] Processed MCQ:`, {
        exacttimestamp: processedMcq.exacttimestamp,
        youtubevideotitle: processedMcq.youtubevideotitle,
        confidence: processedMcq.confidence
      });
      
      return processedMcq;
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

exports.generateSummaryAndDoubts = async (req, res) => {
  try {
    const { videoId, mode = 'summary', question } = req.body;
    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    if (!video.transcript?.segments || video.transcript.segments.length === 0) {
      return res.status(400).json({ success: false, message: 'Transcript not found for this video. Please generate transcript first.' });
    }

    let n8nResponse;
    try {
      // Use the video ID as session_id and transcript data, pass provided mode, question, and videoId
      n8nResponse = await n8nService.generateSummaryAndDoubts(
        video._id.toString(),
        video.transcript,
        mode,
        question, // question parameter (will be null for summary mode)
        video.youtubeVideoId // videoId parameter
      );
    } catch (err) {
      console.error(`[SummaryAndDoubts] mode: ${mode} n8n error:`, err.message);
      const isTimeout = err.message === 'AI_PROCESSING_TIMEOUT';
      return res.status(isTimeout ? 504 : 502).json({ 
        success: false, 
        error: isTimeout ? 'AI_PROCESSING_TIMEOUT' : 'AI_PROCESSING_ERROR', 
        message: isTimeout ? 'The AI service is taking longer than expected.' : `AI service error: ${err.message}`
      });
    }

    if (n8nResponse) {
      // Debug: Log the entire n8n response
      console.log('Raw n8n response:', JSON.stringify(n8nResponse, null, 2));
      
      // n8n often returns an array or an object with an 'output' field
      let data = Array.isArray(n8nResponse) ? n8nResponse[0] : n8nResponse;
      console.log('After array processing:', JSON.stringify(data, null, 2));
      
      // If data has an 'output' property (very common in n8n AI nodes), unwrap it
      if (data && data.output) {
        data = data.output;
        console.log('After output unwrapping:', JSON.stringify(data, null, 2));
      }

      // Initialize summary if not exists
      if (!video.summary) video.summary = { generatedAt: new Date() };

      if (mode === 'summary') {
        video.summary.shortSummary = data.summary || data.output?.summary || '';
        
        // Try multiple paths for summaryCitation
        let citation = null;
        console.log('Available data keys:', Object.keys(data));
        console.log('data.summaryCitation exists:', !!data.summaryCitation);
        console.log('data.output exists:', !!data.output);
        
        if (data.summaryCitation) {
          citation = data.summaryCitation;
          console.log('Using data.summaryCitation');
        } else if (data.output?.summaryCitation) {
          citation = data.output.summaryCitation;
          console.log('Using data.output.summaryCitation');
        } else if (data.citation) {
          citation = data.citation;
          console.log('Using data.citation');
        } else if (data.output?.citation) {
          citation = data.output.citation;
          console.log('Using data.output.citation');
        } else {
          console.log('No citation found in any path!');
        }
        
        video.summary.summaryCitation = citation;
        console.log('Setting summaryCitation to:', JSON.stringify(video.summary.summaryCitation, null, 2));
      } else if (mode === 'doubt') {
        video.summary.doubts = data.doubts || data.output?.doubts || '';
        
        // Try multiple paths for doubtsCitation
        let doubtCitation = null;
        if (data.doubtsCitation) {
          doubtCitation = data.doubtsCitation;
        } else if (data.output?.doubtsCitation) {
          doubtCitation = data.output.doubtsCitation;
        } else if (data.citation) {
          doubtCitation = data.citation;
        } else if (data.output?.citation) {
          doubtCitation = data.output.citation;
        }
        
        video.summary.doubtsCitation = doubtCitation;
        console.log('Setting doubtsCitation to:', JSON.stringify(video.summary.doubtsCitation, null, 2));
      }

      video.summary.generatedAt = new Date();
      await video.save();
    }

    res.status(200).json({ success: true, summary: video.summary });
  } catch (error) {
    console.error('[SummaryAndDoubts] Controller Error:', error);
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

exports.deleteVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // Check if user owns this video
    if (video.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this video' });
    }

    // Delete associated quizzes
    await Quiz.deleteMany({ videoId: videoId });
    
    // Delete associated quiz attempts
    await QuizAttempt.deleteMany({ quizId: { $in: await Quiz.find({ videoId: videoId }).distinct('_id') } });

    // Delete the video
    await Video.findByIdAndDelete(videoId);

    console.log(`[Delete] Video ${videoId} and associated data deleted by user ${req.user.id}`);

    res.status(200).json({ 
      success: true, 
      message: 'Video and all associated data deleted successfully' 
    });
  } catch (error) {
    console.error(`[Delete] Error deleting video: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
