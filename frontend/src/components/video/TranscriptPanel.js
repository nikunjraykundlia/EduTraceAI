import { useRef, useEffect, useState } from 'react';
import { FileText, Loader2, Download, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import './TranscriptPanel.css';

export default function TranscriptPanel({ segments, onTimestampClick, activeTime, loading, onGenerate, title, youtubeUrl }) {
  const [downloading, setDownloading] = useState(false);
  const containerRef = useRef(null);
  const activeSegmentRef = useRef(null);

  // Format seconds to [MM:SS]
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Scroll active segment into view
  useEffect(() => {
    if (activeSegmentRef.current && containerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeTime]);

  if (!segments || segments.length === 0) {
    return (
      <div className="transcript-container" style={{ alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--cyan)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
          {loading ? <Loader2 className="animate-spin" size={24} /> : <AlertCircle size={24} />}
        </div>
        <div>
          <h4 className="t-h4" style={{ marginBottom: '0.5rem' }}>
            {loading ? 'Ingesting Transcript...' : 'Transcript Unavailable'}
          </h4>
          <p className="t-small" style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {loading ? 'Establishing index matrix.' : 'Index extraction failed.'}
          </p>
          {!loading && onGenerate && (
            <button 
              onClick={onGenerate} 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem' }}
            >
              Retry Protocol
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="transcript-container">
      <div className="transcript-header">
        <h3 className="transcript-title">TRANSCRIPT LOG</h3>
        <button 
          onClick={async (e) => {
            e.stopPropagation();
            if (downloading) return;
            setDownloading(true);
            try {
              const response = await api.post('/transcription/download', {
                title: title || 'Video Transcript',
                segments,
                youtubeUrl
              }, {
                responseType: 'blob'
              });
              
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `${(title || 'Video').replace(/[^a-z0-9\s]/gi, '_')}_YouTube_Transcript.pdf`);
              document.body.appendChild(link);
              link.click();
              link.remove();
            } catch (err) {
              console.error('Download failed:', err);
              alert('Failed to drop transcript payload. Please re-initiate.');
            } finally {
              setDownloading(false);
            }
          }}
          disabled={downloading}
          className="btn btn-secondary"
          style={{ 
            padding: '0.4rem 0.8rem', 
            fontSize: '0.8rem', 
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          {downloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
          {downloading ? 'Bundling...' : 'Extract as PDF'}
        </button>
      </div>
      
      <div className="transcript-body" ref={containerRef}>
        {segments.map((segment, idx) => {
          const isActive = activeTime >= segment.startTime && activeTime < (segments[idx + 1]?.startTime || segment.endTime + 5);
          
          return (
            <div 
              key={idx}
              ref={isActive ? activeSegmentRef : null}
              onClick={() => onTimestampClick(segment.startTime)}
              className={`transcript-segment ${isActive ? 'active' : ''}`}
            >
              <div className="transcript-timestamp">
                [{formatTime(segment.startTime)}]
              </div>
              <div className="transcript-text">
                {segment.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
