const crypto = require('crypto');
const path = require('path');
const { extractAudio, cleanupFile } = require('../services/audioExtractionService');
const { uploadToImageKit } = require('../services/imagekitService');
const { triggerQuizWebhook } = require('../services/n8nQuizService');
const { extractVideoId } = require('../services/transcriptService');

/**
 * @desc    Generate quiz from a YouTube URL
 *          Pipeline: YouTube → yt-dlp audio → ImageKit upload → n8n quiz webhook
 * @route   POST /api/test/generate
 * @access  Private
 */
exports.generateQuiz = async (req, res) => {
    let localAudioPath = null;
    try {
        const { youtubeUrl, audioUrl } = req.body;

        if (!youtubeUrl && !audioUrl) {
            return res.status(400).json({ success: false, message: 'YouTube URL or Audio URL is required' });
        }

        // Generate a unique session ID for this quiz request
        const sessionId = crypto.randomUUID();
        let imagekitUrl = audioUrl;
        
        // Extract videoId from YouTube URL for n8n workflow
        const videoId = youtubeUrl ? extractVideoId(youtubeUrl) : null;

        // Only extract and upload if audioUrl wasn't provided
        if (!imagekitUrl) {
            // 1. Extract audio from YouTube using yt-dlp
            console.log(`[Quiz] Step 1: Extracting audio from ${youtubeUrl}`);
            try {
                localAudioPath = await extractAudio(youtubeUrl);
            } catch (err) {
                return res.status(500).json({
                    success: false,
                    error: 'AUDIO_EXTRACTION_FAILED',
                    message: err.message
                });
            }

            // 2. Upload the extracted MP3 to ImageKit
            console.log(`[Quiz] Step 2: Uploading ${path.basename(localAudioPath)} to ImageKit`);
            let imageKitResponse;
            try {
                imageKitResponse = await uploadToImageKit(localAudioPath, path.basename(localAudioPath));
                imagekitUrl = imageKitResponse.url;
            } catch (err) {
                return res.status(502).json({
                    success: false,
                    error: 'IMAGEKIT_UPLOAD_FAILED',
                    message: err.message
                });
            }

            // 3. Clean up the local temporary file
            cleanupFile(localAudioPath);
            localAudioPath = null;
        } else {
            console.log(`[Quiz] Reusing existing audio URL: ${imagekitUrl}`);
        }

        // 4. Trigger quiz-generation webhook with session_id and videoId
        console.log(`[Quiz] Step 3: Triggering quiz webhook — session: ${sessionId}, videoId: ${videoId}`);

        let webhookResponse;
        try {
            webhookResponse = await triggerQuizWebhook(sessionId, videoId);
        } catch (err) {
            return res.status(502).json({
                success: false,
                error: 'QUIZ_WEBHOOK_FAILED',
                message: err.message
            });
        }

        // 5. Extract questions from webhook response (flexible parsing)
        let questions = [];
        if (Array.isArray(webhookResponse)) {
            questions = webhookResponse;
        } else if (webhookResponse && typeof webhookResponse === 'object') {
            questions = webhookResponse.questions || webhookResponse.data || webhookResponse.mcqs || [];
        }

        // 6. Return the quiz to the client
        res.status(200).json({
            success: true,
            session_id: sessionId,
            questions,
            audioUrl: imagekitUrl,
            message: 'Quiz generated successfully'
        });

    } catch (error) {
        console.error(`[Quiz] Unexpected error in generateQuiz: ${error.message}`);
        if (localAudioPath) cleanupFile(localAudioPath);

        res.status(500).json({
            success: false,
            message: 'Internal server error during quiz generation pipeline'
        });
    }
};
