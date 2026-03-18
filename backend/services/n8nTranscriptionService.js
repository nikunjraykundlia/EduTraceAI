const axios = require('axios');

/**
 * Sends audio URL to n8n webhook for transcription
 * @param {string} audioUrl - Public URL of the audio file (e.g. from ImageKit)
 * @param {string} youtubeUrl - Original YouTube URL for context
 * @returns {Promise<Object>} - Transcript response from n8n
 */
const sendAudioUrlToN8n = async (audioUrl, youtubeUrl) => {
    const WEBHOOK_URL = process.env.N8N_TRANSCRIPTION_WEBHOOK || 'https://nikunjn8n.up.railway.app/webhook/upload-yt';
    const maxRetries = 2;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`[Transcription] Retry attempt ${attempt} for n8n...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s between retries
            }

            console.log(`Sending audio URL to n8n: ${WEBHOOK_URL} (Attempt ${attempt + 1})`);

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
            lastError = error;
            console.error(`Error in sendAudioUrlToN8n (Attempt ${attempt + 1}): ${error.message}`);
            
            // Only retry on network errors or 5xx server errors
            if (error.response && error.response.status < 500) {
                break; // Don't retry on 4xx errors
            }
            
            if (attempt === maxRetries) {
                if (error.response) {
                    console.error('n8n error response:', error.response.data);
                }
                throw new Error(`n8n transcription failed after ${maxRetries + 1} attempts: ${error.message}`);
            }
        }
    }
};

/**
 * Sends transcript data to n8n webhook
 * @param {Object} transcriptData - Transcript data with segments
 * @param {string} youtubeUrl - Original YouTube URL for context
 * @returns {Promise<Object>} - Response from n8n
 */
const sendTranscriptToN8n = async (transcriptData, youtubeUrl) => {
    const WEBHOOK_URL = process.env.N8N_TRANSCRIPTION_WEBHOOK || 'https://nikunjn8n.up.railway.app/webhook/upload-yt';
    const maxRetries = 2;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`[Transcript] Retry attempt ${attempt} for n8n...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            console.log(`Sending transcript data to n8n: ${WEBHOOK_URL} (Attempt ${attempt + 1})`);

            const response = await axios.post(WEBHOOK_URL, {
                transcript: transcriptData,
                segments: transcriptData.segments,
                rawText: transcriptData.raw,
                videoId: transcriptData.videoId,
                youtubeUrl: youtubeUrl,
                timestamp: new Date().toISOString(),
                source: 'serpapi'
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 300000
            });

            if (response.data) {
                return response.data;
            } else {
                throw new Error('No response data from n8n');
            }
        } catch (error) {
            lastError = error;
            console.error(`Error in sendTranscriptToN8n (Attempt ${attempt + 1}): ${error.message}`);
            
            if (error.response && error.response.status < 500) {
                break;
            }
            
            if (attempt === maxRetries) {
                if (error.response) {
                    console.error('n8n error response:', error.response.data);
                }
                throw new Error(`n8n webhook failed after ${maxRetries + 1} attempts: ${error.message}`);
            }
        }
    }
};

/**
 * Sends transcript data to n8n webhook (fire-and-forget, no waiting for response)
 * @param {Object} transcriptData - Transcript data with segments
 * @param {string} youtubeUrl - Original YouTube URL for context
 */
const sendTranscriptToN8nAsync = (transcriptData, youtubeUrl) => {
    const WEBHOOK_URL = process.env.N8N_TRANSCRIPTION_WEBHOOK || 'https://nikunjn8n.up.railway.app/webhook/upload-yt';
    
    console.log(`[FireForget] Sending transcript to n8n: ${WEBHOOK_URL}`);
    
    axios.post(WEBHOOK_URL, {
        transcript: transcriptData,
        segments: transcriptData.segments,
        rawText: transcriptData.raw,
        videoId: transcriptData.videoId,
        youtubeUrl: youtubeUrl,
        timestamp: new Date().toISOString(),
        source: 'serpapi'
    }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
    }).then(() => {
        console.log(`[FireForget] Transcript sent to n8n successfully`);
    }).catch((error) => {
        console.error(`[FireForget] Error sending to n8n (non-blocking): ${error.message}`);
    });
};

module.exports = {
    sendAudioUrlToN8n,
    sendTranscriptToN8n,
    sendTranscriptToN8nAsync
};
