const axios = require('axios');

const n8nClient = axios.create({
  baseURL: process.env.N8N_BASE_URL,
  timeout: 60000 // 60 seconds timeout per requirements
});

/**
 * Sends a transcript to n8n to generate a quiz
 */
exports.generateQuiz = async (webhookPayload) => {
  try {
    // Ensuring we request 5 MCQs if not specified, matching the target webhook path
    const payload = {
      ...webhookPayload,
      num_mcqs: webhookPayload.num_mcqs || 5
    };

    const response = await n8nClient.post(process.env.N8N_QUIZ_WEBHOOK_URL, payload);
    // Returning dummy content for now assuming n8n may not be strictly running during initial dev
    if(!response.data || !response.data.success) {
      console.warn('n8n response missing or empty, returning default');
    }
    return response.data;
  } catch (error) {
    console.error('Error in n8nService generateQuiz:', error.message);
    throw new Error('AI_PROCESSING_TIMEOUT');
  }
};

/**
 * Sends a transcript to n8n to generate a summary
 */
exports.generateSummary = async (webhookPayload) => {
  try {
    const response = await n8nClient.post(process.env.N8N_SUMMARY_WEBHOOK, webhookPayload);
    return response.data;
  } catch (error) {
    console.error('Error in n8nService generateSummary:', error.message);
    throw new Error('AI_PROCESSING_TIMEOUT');
  }
};

/**
 * Sends chat query to n8n doubt resolver
 */
exports.resolveDoubt = async (webhookPayload) => {
  try {
    const response = await n8nClient.post(process.env.N8N_CHAT_WEBHOOK, webhookPayload);
    return response.data;
  } catch (error) {
    console.error('Error in n8nService resolveDoubt:', error.message);
    throw new Error('AI_PROCESSING_TIMEOUT');
  }
};
/**
 * Sends a session_id, transcript data, and mode to n8n to generate summary or doubt solving
 */
exports.generateSummaryAndDoubts = async (sessionId, transcript, mode = 'summary', question = null, videoId = null) => {
  const payload = {
    session_id: sessionId,
    videoId: videoId || transcript.videoId || transcript.youtubeVideoId,
    mode: mode
  };

  // Add question only if mode is 'doubt' and question is provided
  if (mode === 'doubt' && question) {
    payload.question = question;
  }

  const maxRetries = 2;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[SummaryAndDoubts] Retry attempt ${attempt} for mode: ${mode}...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s between retries
      }

      const response = await axios.post('https://nikunjn8n.up.railway.app/webhook/summaries-and-doubt', payload, {
        timeout: 300000, // 5 minutes
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      lastError = error;
      console.warn(`[SummaryAndDoubts] Attempt ${attempt} failed for mode ${mode}: ${error.message}`);
      
      if (error.response && error.response.status < 500) break;
    }
  }

  if (lastError.code === 'ECONNABORTED' || lastError.message.includes('timeout')) {
    console.error(`Error: n8n request timed out for mode ${mode} after multiple attempts.`);
  } else {
    console.error(`Error in n8nService generateSummaryAndDoubts (${mode}):`, lastError.message);
  }
  throw new Error('AI_PROCESSING_TIMEOUT');
};
