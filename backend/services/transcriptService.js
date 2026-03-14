const { YouTubeTranscriptApi } = require('yt-transcript-api');

/**
 * Extracts video ID from a YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 */
const extractVideoId = (url) => {
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
      /(?:youtu\.be\/)([^?\s]+)/,
      /(?:youtube\.com\/embed\/)([^?\s]+)/,
      /(?:youtube\.com\/v\/)([^?\s]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    // Check if it's already a 11-char ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes('youtube.com')) {
      return parsedUrl.searchParams.get('v');
    } else if (parsedUrl.hostname.includes('youtu.be')) {
      return parsedUrl.pathname.slice(1);
    }
  } catch (error) {
    console.error('Invalid URL passed to extractVideoId:', url);
  }
  return null;
};

/**
 * Fetches the transcript for a given YouTube video
 * @param {string} url - YouTube video URL
 * @returns {Promise<Object>} - Transcript segments and raw text
 */
const fetchTranscript = async (url) => {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error(`Invalid YouTube URL: ${url}`);
    }

    console.log(`[TranscriptService] Fetching transcript for videoId: ${videoId}`);
    const transcriptList = await YouTubeTranscriptApi.getTranscript(videoId);
    
    if (!transcriptList || transcriptList.length === 0) {
      throw new Error('Transcript returned empty.');
    }

    console.log(`[TranscriptService] Got ${transcriptList.length} segments. Sample:`, JSON.stringify(transcriptList[0]));

    let rawText = '';
    const segments = transcriptList.map(item => {
      const text = (item.text || '')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\n/g, ' ')
        .trim();
      rawText += text + ' ';

      const startTime = item.start || 0;
      const duration = item.duration || item.dur || 0;

      return {
        text,
        startTime: Math.round(startTime * 100) / 100,
        endTime: Math.round((startTime + duration) * 100) / 100
      };
    });

    console.log(`[TranscriptService] Parsed ${segments.length} segments, raw text length: ${rawText.length}`);

    return {
      videoId,
      raw: rawText.trim(),
      segments
    };
  } catch (error) {
    console.error(`[TranscriptService] Error fetching transcript: ${error.message}`);
    throw new Error(`Could not fetch video transcript: ${error.message}`);
  }
};

module.exports = {
  extractVideoId,
  fetchTranscript
};
