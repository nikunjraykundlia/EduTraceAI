const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const execPromise = promisify(exec);
const ffmpegPath = require('ffmpeg-static');

/**
 * Extracts audio from a YouTube URL using yt-dlp
 * @param {string} url - YouTube video URL
 * @returns {Promise<string>} - Path to the extracted audio file
 */
const extractAudio = async (url) => {
    try {
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        const outputFileName = `${videoId}_${Date.now()}.mp3`;
        const outputPath = path.join(tempDir, outputFileName);

        // Get the directory containing ffmpeg binary (yt-dlp expects the directory)
        const ffmpegDir = path.dirname(ffmpegPath);

        // Command to extract audio as mp3
        // --ffmpeg-location: path to ffmpeg binary for audio conversion
        // --no-check-certificate: bypass SSL issuer errors
        // --force-ipv4: resolve "Connection refused" errors common on some networks
        // --user-agent: mimic a modern browser to avoid blocks
        const command = `yt-dlp --ffmpeg-location "${ffmpegDir}" --no-check-certificate --force-ipv4 --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -x --audio-format mp3 -o "${outputPath}" "${url}"`;

        console.log(`Executing command: ${command}`);
        await execPromise(command);

        if (fs.existsSync(outputPath)) {
            return outputPath;
        } else {
            // Sometimes yt-dlp appends .mp3 even if we specified it, or if it was already there
            // Let's check if the file exists anyway (maybe yt-dlp adds it automatically)
            throw new Error('Audio extraction failed: Output file not found');
        }
    } catch (error) {
        console.error(`Error in extractAudio: ${error.message}`);
        throw new Error(`Audio extraction failed: ${error.message}`);
    }
};

/**
 * Extracts video ID from a YouTube URL (helper)
 */
const extractVideoId = (url) => {
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname.includes('youtube.com')) {
            return parsedUrl.searchParams.get('v');
        } else if (parsedUrl.hostname.includes('youtu.be')) {
            return parsedUrl.pathname.slice(1);
        }
    } catch (error) {
        return null;
    }
    return null;
};

/**
 * Deletes a file from the filesystem
 * @param {string} filePath - Path to the file to delete
 */
const cleanupFile = (filePath) => {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up file: ${filePath}`);
        } catch (err) {
            console.error(`Error cleaning up file: ${err.message}`);
        }
    }
};

module.exports = {
    extractAudio,
    cleanupFile
};
