const mongoose = require('mongoose');
const ChatSession = require('../models/ChatSession');
const Video = require('../models/Video');
const n8nService = require('../services/n8nService');

// @desc    Ask a question about a video
// @route   POST /api/chat/:videoId
// @access  Private
exports.askQuestion = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { question, sessionId } = req.body;


    // First, find the video by youtubeVideoId or ObjectId
    let video;
    // Try to find by ObjectId first
    if (mongoose.Types.ObjectId.isValid(videoId)) {
      video = await Video.findById(videoId);
    }
    
    // If not found by ObjectId, try by youtubeVideoId
    if (!video) {
      video = await Video.findOne({ youtubeVideoId: videoId });
    }
    
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found. Please ensure the video has been processed.' });
    }


    let chatSession;
    if (sessionId) {
      chatSession = await ChatSession.findById(sessionId);
      if (!chatSession) return res.status(404).json({ success: false, message: 'Chat session not found' });
    } else {
      chatSession = await ChatSession.create({
        videoId: video._id, // Use the video's ObjectId
        userId: req.user.id,
        messages: []
      });
    }

    // Add user message
    chatSession.messages.push({
      role: 'user',
      content: question,
      timestamp: new Date()
    });

    // We pass history to n8n (excluding the current question)
    const chatHistory = chatSession.messages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.role === 'assistant' ? m.mainAnswer : m.content
    }));

    // Call n8n to generate chat response using the new summary-doubts webhook
    let n8nResponse;
    try {
      // Validate transcript exists before calling n8n
      if (!video.transcript || (!video.transcript.raw && !video.transcript.segments)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Video transcript not available. Please wait for transcription to complete.' 
        });
      }

      // Per user request, "doubts trigger if user clicks on 'Sends'"
      // We use the same service as summary but with mode: 'doubt'
      n8nResponse = await n8nService.generateSummaryAndDoubts(
        video._id.toString(),
        video.transcript,
        'doubt',
        question,
        video.youtubeVideoId
      );
    } catch (err) {
      console.error('[ChatDoubt] n8n error:', err.message);
      console.error('[ChatDoubt] Full error:', err);
      const statusCode = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' ? 504 : 502;
      return res.status(statusCode).json({ 
        success: false, 
        error: statusCode === 504 ? 'AI_PROCESSING_TIMEOUT' : 'AI_SERVICE_ERROR', 
        message: 'AI service is temporarily unavailable. Please try again in a few moments.' 
      });
    }
    // Map the new output format back to the chat response
    // format: { doubts: "...", citation: { evidence: "..." } }
    let data = Array.isArray(n8nResponse) ? n8nResponse[0] : n8nResponse;
    
    if (data && data.output) {
      data = data.output;
    }

    // Validate n8n response structure
    if (!data || typeof data !== 'object') {
      return res.status(500).json({ 
        success: false, 
        message: 'AI service returned invalid response. Please try again.' 
      });
    }

    const assistantData = {
      shortAnswer: 'Doubt Resolved',
      mainAnswer: data.doubts || 'I could not find a specific answer in the transcript.',
      evidence: data.doubtsCitation ? [{
        transcriptExcerpt: data.doubtsCitation.evidence || '',
        timestamp: { 
          startTime: data.doubtsCitation.timestampRange ? 
            convertTimestampToSeconds(data.doubtsCitation.timestampRange.split(',')[0].split('-')[0].trim()) : 0
        }
      }] : [],
      confidenceLevel: 'high'
    };

    // Helper function to convert timestamp to seconds
    function convertTimestampToSeconds(timestamp) {
      if (!timestamp || typeof timestamp !== 'string') return 0;
      
      const parts = timestamp.split(':');
      if (parts.length === 3) {
        // HH:MM:SS format
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        return hours * 3600 + minutes * 60 + seconds;
      } else if (parts.length === 2) {
        // MM:SS format (from n8n)
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        return minutes * 60 + seconds;
      } else {
        // Invalid format
        return 0;
      }
    }

    const assistantMessage = {
      role: 'assistant',
      shortAnswer: assistantData.shortAnswer,
      mainAnswer: assistantData.mainAnswer,
      evidence: assistantData.evidence,
      confidenceLevel: assistantData.confidenceLevel,
      timestampRange: data.doubtsCitation?.timestampRange,
      youtubeVideoTitle: data.doubtsCitation?.youtubeVideoTitle,
      timestamp: new Date()
    };

    console.log(`[Chat] Final assistant message:`, JSON.stringify(assistantMessage, null, 2));

    chatSession.messages.push(assistantMessage);
    await chatSession.save();

    // Also update the video's cached doubts if needed
    video.summary.doubts = assistantData.mainAnswer;
    video.summary.doubtsCitation = data.doubtsCitation;
    await video.save();

    res.status(200).json({
      success: true,
      sessionId: chatSession._id,
      response: assistantMessage
    });

  } catch (error) {
    console.error('[Chat] Error in askQuestion:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// @desc    Get chat history for a specific video
// @route   GET /api/chat/:videoId/history
// @access  Private
exports.getChatHistory = async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // First, find the video by youtubeVideoId or ObjectId
    let video;
    // Try to find by ObjectId first
    if (mongoose.Types.ObjectId.isValid(videoId)) {
      video = await Video.findById(videoId);
    }
    
    // If not found by ObjectId, try by youtubeVideoId
    if (!video) {
      video = await Video.findOne({ youtubeVideoId: videoId });
    }
    
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    
    // Now find chat sessions using the video's ObjectId
    const sessions = await ChatSession.find({ 
      videoId: video._id, 
      userId: req.user.id 
    }).sort({ updatedAt: -1 });

    res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error('Error in getChatHistory:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
