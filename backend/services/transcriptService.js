const axios = require('axios');

/**
 * Extracts video ID from a YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 */
const extractVideoId = (url) => {
  try {
    if (!url) return null;
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

    console.log(`[TranscriptService] Fetching transcript for videoId: ${videoId} using SerpAPI`);
    
    const serpApiKey = process.env.SERPAPI_KEY;
    if (!serpApiKey) {
      throw new Error('SERPAPI_KEY not configured in environment variables');
    }

    // Call SerpAPI for YouTube transcript
    const serpUrl = 'https://serpapi.com/search.json';
    
    // Fetch both transcript and video details
    const [transcriptResponse, videoResponse] = await Promise.all([
      axios.get(serpUrl, {
        params: {
          engine: 'youtube_video_transcript',
          v: videoId,
          api_key: serpApiKey
        },
        timeout: 30000
      }),
      axios.get(serpUrl, {
        params: {
          engine: 'youtube',
          v: videoId,
          api_key: serpApiKey
        },
        timeout: 30000
      }).catch(() => ({ data: null })) // Ignore video details error
    ]);

    // Extract video title if available from SerpAPI
    let videoTitle = null;
    if (videoResponse.data) {
      const videoData = videoResponse.data;
      console.log('[TranscriptService] Video response keys:', Object.keys(videoData));
      
      // Try multiple possible locations for title
      if (videoData.video_results && videoData.video_results[0] && videoData.video_results[0].title) {
        videoTitle = videoData.video_results[0].title;
      } else if (videoData.title) {
        videoTitle = videoData.title;
      } else if (videoData.videos && videoData.videos[0] && videoData.videos[0].title) {
        videoTitle = videoData.videos[0].title;
      }
      
      console.log('[TranscriptService] Extracted title from SerpAPI:', videoTitle);
    }

    // Fallback: Use YouTube oEmbed API for title
    if (!videoTitle) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedResponse = await axios.get(oembedUrl, { timeout: 5000 });
        if (oembedResponse.data && oembedResponse.data.title) {
          videoTitle = oembedResponse.data.title;
          console.log('[TranscriptService] Extracted title from oEmbed:', videoTitle);
        }
      } catch (err) {
        console.log('[TranscriptService] oEmbed fetch failed:', err.message);
      }
    }

    const response = transcriptResponse;

    if (!response.data || !response.data.transcript) {
      throw new Error('No transcript available for this video');
    }

    const transcriptList = response.data.transcript;
    
    if (!Array.isArray(transcriptList) || transcriptList.length === 0) {
      throw new Error('Transcript returned empty.');
    }

    console.log(`[TranscriptService] Got ${transcriptList.length} segments from SerpAPI.`);

    let rawText = '';
    const segments = transcriptList.map(item => {
      // Decode HTML entities commonly found in transcripts
      const text = (item.snippet || '')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n/g, ' ')
        .trim();
        
      rawText += text + ' ';

      // SerpAPI returns start_ms and end_ms in milliseconds
      const startTime = (item.start_ms || 0) / 1000;
      const endTime = (item.end_ms || 0) / 1000;

      return {
        text,
        startTime: Math.round(startTime * 100) / 100,
        endTime: Math.round(endTime * 100) / 100
      };
    });

    // If no title from API, use first 50 chars of transcript as title
    if (!videoTitle && segments.length > 0) {
      videoTitle = segments[0].text.substring(0, 50) + (segments[0].text.length > 50 ? '...' : '');
      console.log('[TranscriptService] Using first segment as title:', videoTitle);
    }

    return {
      videoId,
      title: videoTitle || 'YouTube Video',
      raw: rawText.trim(),
      segments
    };
  } catch (error) {
    console.error(`[TranscriptService] Error fetching transcript:`, error);
    throw new Error(`Could not fetch video transcript: ${error.message || 'Internal error'}`);
  }
};

/**
 * Parses a transcript string with timestamps [MM:SS] into segments
 * @param {string} rawText 
 * @returns {Array} - Array of segments
 */
const parseTranscriptSegments = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split('\n');
  const parsedSegments = [];

  lines.forEach(line => {
    // Match [MM:SS] or [HH:MM:SS] or [SS.SS]
    const match = line.match(/\[((\d{1,2}:)?\d{1,2}:\d{2})\]/);
    if (match) {
      const timeStr = match[1];
      const text = line.replace(match[0], '').trim();
      
      const parts = timeStr.split(':').map(Number);
      let seconds = 0;
      if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1];
      }
      
      parsedSegments.push({
        startTime: seconds,
        text,
        endTime: seconds + 5 // Approximate end time
      });
    } else if (line.trim()) {
      if (parsedSegments.length > 0) {
        parsedSegments[parsedSegments.length - 1].text += ' ' + line.trim();
      } else {
        parsedSegments.push({ startTime: 0, text: line.trim(), endTime: 5 });
      }
    }
  });

  return parsedSegments;
};

module.exports = {
  extractVideoId,
  fetchTranscript,
  parseTranscriptSegments
};

