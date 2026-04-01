'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Video, History, Play, Trash2, CheckCircle2, ArrowRight } from 'lucide-react';
import TranscriptPanel from '@/components/video/TranscriptPanel';
import './Personal.css';

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

  const getTranscriptSegments = () => {
    if (!transcriptData) return [];
    
    if (transcriptData.segments && Array.isArray(transcriptData.segments) && transcriptData.segments.length > 0) {
      return transcriptData.segments;
    }
    
    if (Array.isArray(transcriptData) && transcriptData.length > 0) {
      return transcriptData;
    }
    
    const rawText = transcriptData.raw || transcriptData.timestampedTranscript || (typeof transcriptData === 'string' ? transcriptData : "");
    if (!rawText) return [{ startTime: 0, text: "No transcript content available." }];

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
    <div style={{ paddingBottom: '4rem' }}>
      <div className="section-label" style={{ marginBottom: '2rem' }}>
        01 — Personal Extraction Interface
      </div>

      <div className="extraction-card top-highlight">
        {!transcriptData ? (
          <div>
            <h2 className="t-h2" style={{ marginBottom: '0.5rem' }}>Inject Video Source</h2>
            <p className="t-small" style={{ marginBottom: '2rem' }}>Enter any educational YouTube URL to extract taxonomy and insights.</p>
            
            <form onSubmit={handleSubmit} className="url-input-container">
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="url"
                  className="input-field mono"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={loading}
                  style={{ 
                    borderColor: url && !isYoutubeUrl(url) ? 'var(--rose)' : '',
                    paddingTop: '0.85rem', paddingBottom: '0.85rem'
                  }}
                />
                {url && !isYoutubeUrl(url) && (
                  <p style={{ color: 'var(--rose)', fontSize: '0.85rem', marginTop: '0.5rem', fontFamily: 'var(--font-data)' }}>
                    INVALID_URL_FORMAT
                  </p>
                )}
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || !url || !isYoutubeUrl(url)}
                style={{ padding: '0.85rem 1.5rem', height: '48px' }}
              >
                {loading ? 'Processing...' : (
                  <>Extract <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {loading && !transcriptData && (
              <div style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="t-label" style={{ color: 'var(--cyan)' }}>Deep-Extracting Context</span>
                  <span className="t-label" style={{ color: 'var(--text-muted)' }}>5-10s</span>
                </div>
                <div className="extraction-loader">
                  <div className="extraction-knob"></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
              <CheckCircle2 color="var(--emerald)" size={20} />
              <span className="t-label" style={{ color: 'var(--emerald)', margin: 0 }}>Extraction Complete</span>
            </div>
            
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
                Disconnect Source
              </button>
              <button onClick={handleProceed} className="btn btn-primary" disabled={loading}>
                {loading ? 'Committing...' : 'Enter Focus Viewer'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="section-label" style={{ marginTop: '4rem', marginBottom: '1.5rem' }}>
        02 — Extracted Knowledge Archives
      </div>

      {mounted && history.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p className="t-small">No archives located. Initialize an extraction above.</p>
        </div>
      ) : mounted ? (
        <div className="history-grid">
          {history.map((video) => (
            <div 
              key={video._id} 
              className="video-card"
              onClick={() => router.push(`/personal/video/${video._id}`)}
            >
              <div className="video-thumbnail-container">
                <img 
                  src={video.thumbnail || `https://img.youtube.com/vi/${video.youtubeVideoId}/mqdefault.jpg`} 
                  className="video-thumbnail"
                  alt={video.title}
                />
                <div className="video-thumbnail-overlay">
                  <div className="play-overlay">
                    <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />
                  </div>
                </div>
              </div>
              <div className="video-content">
                <h3 className="video-title" title={video.title}>
                  {video.title}
                </h3>
                <div className="video-meta">
                  <span className="badge badge-cyan">Processed</span>
                  <span className="video-date">
                    {new Date(video.createdAt).toLocaleDateString().replace(/\//g, '.')}
                  </span>
                </div>
                <button
                  className="btn-delete-video"
                  onClick={(e) => handleDeleteVideo(e, video._id)}
                  title="Delete Protocol"
                  style={{ position: 'absolute', top: '10px', right: '10px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading records...</div>
      )}
    </div>
  );
}
