const axios = require('axios');

/**
 * Sends audio URL to n8n webhook for transcription
 * @param {string} audioUrl - Public URL of the audio file (e.g. from ImageKit)
 * @param {string} youtubeUrl - Original YouTube URL for context
 * @returns {Promise<Object>} - Transcript response from n8n
 */
const sendAudioUrlToN8n = async (audioUrl, youtubeUrl) => {
    try {
        const WEBHOOK_URL = process.env.N8N_TRANSCRIPTION_WEBHOOK || 'https://nikunjn8n.up.railway.app/webhook/upload-yt';

        console.log(`Sending audio URL to n8n: ${WEBHOOK_URL}`);

        const response = await axios.post(WEBHOOK_URL, {
            url: audioUrl,
            audioUrl: audioUrl,
            imagekit_url: audioUrl,
            youtubeUrl: youtubeUrl,
            timestamp: new Date().toISOString()
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 300000 // 5 minutes timeout for transcription tasks
        });

        if (response.data) {
            return response.data;
        } else {
            throw new Error('No response data from n8n');
        }
    } catch (error) {
        console.error(`Error in sendAudioUrlToN8n: ${error.message}`);
        if (error.response) {
            console.error('n8n error response:', error.response.data);
        }
        throw new Error(`n8n transcription failed: ${error.message}`);
    }
};

module.exports = {
    sendAudioUrlToN8n
};
