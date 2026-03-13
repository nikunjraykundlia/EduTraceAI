const { extractAudio, cleanupFile } = require('../services/audioExtractionService');
const { uploadToImageKit } = require('../services/imagekitService');
const { sendAudioUrlToN8n } = require('../services/n8nTranscriptionService');
const path = require('path');

/**
 * Handles YouTube URL submission for advanced transcription
 * (yt-dlp -> audio -> ImageKit -> n8n -> transcript)
 */
exports.generateAdvancedTranscript = async (req, res) => {
    let localAudioPath = null;
    try {
        const { youtubeUrl } = req.body;

        if (!youtubeUrl) {
            return res.status(400).json({ success: false, message: 'YouTube URL is required' });
        }

        // 1. Extract audio from YouTube using yt-dlp
        console.log(`Step 1: Extracting audio from ${youtubeUrl}`);
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
        console.log(`Step 2: Uploading ${path.basename(localAudioPath)} to ImageKit`);
        let imageKitResponse;
        try {
            imageKitResponse = await uploadToImageKit(localAudioPath, path.basename(localAudioPath));
        } catch (err) {
            return res.status(502).json({
                success: false,
                error: 'IMAGEKIT_UPLOAD_FAILED',
                message: err.message
            });
        }

        // 3. Send the public ImageKit URL to n8n for transcription
        console.log(`Step 3: Sending URL ${imageKitResponse.url} to n8n`);
        let n8nResponse;
        try {
            n8nResponse = await sendAudioUrlToN8n(imageKitResponse.url, youtubeUrl);
        } catch (err) {
            return res.status(502).json({
                success: false,
                error: 'N8N_COMMUNICATION_FAILED',
                message: err.message
            });
        }

        // 4. Clean up the local temporary file
        cleanupFile(localAudioPath);
        localAudioPath = null;

        // 5. Return the transcript to the client
        res.status(200).json({
            success: true,
            transcript: n8nResponse,
            audioUrl: imageKitResponse.url,
            message: 'Advanced transcription via ImageKit pipeline completed successfully'
        });

    } catch (error) {
        console.error(`Unexpected error in generateAdvancedTranscript: ${error.message}`);
        // Ensure cleanup even on unexpected errors
        if (localAudioPath) cleanupFile(localAudioPath);

        res.status(500).json({
            success: false,
            message: 'Internal server error during transcription pipeline'
        });
    }
};
