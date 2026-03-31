const axios = require('axios');

const QUIZ_WEBHOOK_URL = process.env.N8N_QUIZ_WEBHOOK_URL || 'https://nikunjn8n.up.railway.app/webhook/get-5-quiz';

/**
 * Triggers quiz-generation webhook with session_id and videoId.
 * n8n queries MongoDB to get transcript data and generates MCQ questions.
 *
 * @param {string} sessionId  - Unique session identifier
 * @param {string} videoId    - YouTube video ID to query transcript from MongoDB
 * @returns {Promise<Object>} - { session_id, questions: [...] }
 */
const triggerQuizWebhook = async (sessionId, videoId) => {
    try {
        console.log(`Triggering quiz webhook at: ${QUIZ_WEBHOOK_URL} for videoId: ${videoId}`);

        const response = await axios.post(QUIZ_WEBHOOK_URL, {
            session_id: sessionId,
            videoId: videoId
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 300000 // 5 minutes — quiz generation can be slow
        });

        if (!response.data) {
            throw new Error('No response data from quiz webhook');
        }

        return response.data;
    } catch (error) {
        console.error(`Error in triggerQuizWebhook: ${error.message}`);
        if (error.response) {
            console.error('Webhook error response:', error.response.data);
        }
        throw new Error(`Quiz webhook failed: ${error.message}`);
    }
};

module.exports = { triggerQuizWebhook };
