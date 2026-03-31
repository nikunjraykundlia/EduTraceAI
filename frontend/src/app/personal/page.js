'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Video, History, Play, Trash2 } from 'lucide-react';
import TranscriptPanel from '@/components/video/TranscriptPanel';

export default function PersonalModeHome() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [transcriptData, setTranscriptData] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoId, setVideoId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/personal/history');
      if (res.data.success) {
        setHistory(res.data.videos);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const isYoutubeUrl = (testUrl) => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(testUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isYoutubeUrl(url)) {
      return;
    }
    setLoading(true);
    setTranscriptData(null);
    setVideoTitle('');
    setVideoId(null);

    try {
      // Use the fast submission endpoint which uses youtube-transcript-plus
      // This also triggers the advanced audio-pipeline in the background
      const res = await api.post('/personal/video', { youtubeUrl: url });

      if (res.data.success) {
        const video = res.data.video;
        setTranscriptData(video.transcript);
        setAudioUrl(video.audioUrl || '');
        setVideoTitle(video.title || 'YouTube Video');
        setUrl(video.youtubeUrl);
        setVideoId(video._id);
        setLoading(false);
      }
    } catch (err) {
      console.error('Transcript extraction error (silenced):', err);
      setLoading(false);
    }
  };

  const handleProceed = async () => {
    if (videoId) {
      router.push(`/personal/video/${videoId}`);
    }
  };

  const handleDeleteVideo = async (e, videoId) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this video? All associated quizzes and data will be permanently deleted.')) {
      return;
    }
    try {
      await api.delete(`/personal/video/${videoId}`);
      setHistory(history.filter(v => v._id !== videoId));
    } catch (err) {
      console.error('Failed to delete video:', err);
      alert('Failed to delete video. Please try again.');
    }
  };

  // Helper to extract segments for TranscriptPanel
  const getTranscriptSegments = () => {
    if (!transcriptData) return [];
    
    // 1. If we have segments array directly (standard format from backend)
    if (transcriptData.segments && Array.isArray(transcriptData.segments) && transcriptData.segments.length > 0) {
      return transcriptData.segments;
    }
    
    // 2. If transcriptData itself is an array of segments
    if (Array.isArray(transcriptData) && transcriptData.length > 0) {
      return transcriptData;
    }
    
    // 3. Try to parse from raw text if segments are missing
    const rawText = transcriptData.raw || transcriptData.timestampedTranscript || (typeof transcriptData === 'string' ? transcriptData : "");
    if (!rawText) return [{ startTime: 0, text: "No transcript content available." }];

    // Simple parsing for timestamped text like [MM:SS] Text
    const lines = rawText.split('\n');
    const parsedSegments = [];

    lines.forEach(line => {
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
        
        parsedSegments.push({ startTime: seconds, text });
      } else if (line.trim()) {
        if (parsedSegments.length > 0) {
          parsedSegments[parsedSegments.length - 1].text += ' ' + line.trim();
        } else {
          parsedSegments.push({ startTime: 0, text: line.trim() });
        }
      }
    });

    return parsedSegments.length > 0 ? parsedSegments : [{ startTime: 0, text: rawText }];
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '1rem', borderRadius: 'var(--radius-full)' }}>
            <Video size={48} />
          </div>
        </div>
        <h1 className="page-title">Personal Mode</h1>
        <p className="page-description">Paste any educational YouTube URL below to extract a high-fidelity transcript using our AI pipeline.</p>
      </div>

      <div className="glass-card" style={{ padding: '2rem', marginBottom: '3rem' }}>

        {!transcriptData ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <input
                type="url"
                className="input-field"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={loading}
                style={{ padding: '1rem', fontSize: '1.1rem', borderColor: url && !isYoutubeUrl(url) ? 'var(--danger)' : '' }}
              />
              {url && !isYoutubeUrl(url) && (
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Please enter a valid YouTube URL.</p>
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} disabled={loading || !url || !isYoutubeUrl(url)}>
              {loading ? 'Processing...' : 'Start Extraction'}
            </button>
          </form>
        ) : (
          <div className="animate-fade-in">
            <div className="badge badge-green" style={{ marginBottom: '1.5rem' }}>✅ Transcription Complete</div>
            
            <div style={{ marginBottom: '2rem' }}>
              <TranscriptPanel 
                segments={getTranscriptSegments()} 
                activeTime={0}
                onTimestampClick={() => {}}
                loading={false}
                youtubeUrl={url}
                title={videoTitle || 'Video Transcript'}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setTranscriptData(null)} className="btn btn-secondary">
                Try Another URL
              </button>
              <button onClick={handleProceed} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={loading}>
                {loading ? 'Saving...' : 'Proceed to Quiz & Summary'}
              </button>
            </div>
          </div>
        )}

        {loading && !transcriptData && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>Deep-Extracting Audio & Context</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>This powerful AI process can take 30-60 seconds for precision.</p>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
              <div style={{ width: '50%', height: '100%', background: 'var(--accent-gradient)', animation: 'slideRight 2s infinite ease-in-out' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="animate-fade-in" style={{ marginTop: '4rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '0.4rem', borderRadius: 'var(--radius-md)' }}>
            <History size={20} />
          </div>
          Extraction History
        </h2>

        {mounted && history.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>No previous extractions found. Start by pasting a YouTube URL above!</p>
          </div>
        ) : mounted ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {history.map((video) => (
              <div 
                key={video._id} 
                className="glass-card" 
                onClick={() => router.push(`/personal/video/${video._id}`)}
                style={{ cursor: 'pointer', overflow: 'hidden', padding: 0, transition: 'transform 0.2s', border: '1px solid var(--border-color)' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
                  <img 
                    src={video.thumbnail || `https://img.youtube.com/vi/${video.youtubeVideoId}/mqdefault.jpg`} 
                    alt={video.title}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                  />
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate( -50%, -50%)', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={20} color="white" fill="white" />
                  </div>
                </div>
                <div style={{ padding: '1rem', position: 'relative', minHeight: '80px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.4rem', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {video.title}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Extracted on {new Date(video.createdAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={(e) => handleDeleteVideo(e, video._id)}
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      color: 'var(--danger)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Delete video"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Loading history...</div>
        )}
      </div>

    </div>
  );
}
