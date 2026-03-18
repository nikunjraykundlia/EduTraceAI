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

    console.log(`[Chat] Request received: videoId=${videoId}, question="${question}"`);

    // First, find the video by youtubeVideoId or ObjectId
    let video;
    // Try to find by ObjectId first
    if (mongoose.Types.ObjectId.isValid(videoId)) {
      video = await Video.findById(videoId);
      console.log(`[Chat] Video lookup by ObjectId: ${video ? 'found' : 'not found'}`);
    }
    
    // If not found by ObjectId, try by youtubeVideoId
    if (!video) {
      video = await Video.findOne({ youtubeVideoId: videoId });
      console.log(`[Chat] Video lookup by youtubeVideoId: ${video ? 'found' : 'not found'}`);
    }
    
    if (!video) {
      console.log(`[Chat] Video not found for videoId: ${videoId}`);
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    console.log(`[Chat] Video found: ${video._id}, has transcript: ${!!video.transcript}`);

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
        console.log(`[Chat] No transcript available for video: ${video._id}`);
        return res.status(400).json({ 
          success: false, 
          message: 'Video transcript not available. Please wait for transcription to complete.' 
        });
      }

      // Per user request, "doubts trigger if user clicks on 'Sends'"
      // We use the same service as summary but with mode: 'doubt'
      console.log(`[Chat] Calling n8n with videoId: ${video._id}, question: ${question}`);
      n8nResponse = await n8nService.generateSummaryAndDoubts(
        video._id.toString(),
        video.transcript,
        'doubt',
        question,
        video.youtubeVideoId
      );
      console.log(`[Chat] n8n response:`, JSON.stringify(n8nResponse, null, 2));
    } catch (err) {
      console.error('[ChatDoubt] n8n error:', err.message);
      console.error('[ChatDoubt] Full error:', err);
      return res.status(504).json({ 
        success: false, 
        error: 'AI_PROCESSING_TIMEOUT', 
        message: 'AI service is temporarily unavailable. Please try again in a few moments.' 
      });
    }

    // Map the new output format back to the chat response
    // format: { doubts: "...", citation: { evidence: "..." } }
    let data = Array.isArray(n8nResponse) ? n8nResponse[0] : n8nResponse;
    console.log(`[Chat] After array processing:`, JSON.stringify(data, null, 2));
    
    if (data && data.output) {
      data = data.output;
      console.log(`[Chat] After output unwrapping:`, JSON.stringify(data, null, 2));
    }

    // Validate n8n response structure
    if (!data || typeof data !== 'object') {
      console.log(`[Chat] Invalid n8n response structure:`, data);
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
      if (!timestamp) return 0;
      const parts = timestamp.split(':');
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
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
    res.status(500).json({ success: false, message: error.message });
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
