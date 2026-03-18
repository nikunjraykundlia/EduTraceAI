import { useRef, useEffect, useState } from 'react';
import { FileText, Loader2, Download } from 'lucide-react';
import api from '../../lib/api';

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
      <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? <Loader2 className="animate-spin" size={24} /> : <FileText size={24} />}
        </div>
        <div>
          <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
            {loading ? 'Fetching transcript...' : 'No transcript available'}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {loading ? 'This may take a few seconds.' : 'Could not auto-fetch. Try manually.'}
          </p>
          {!loading && onGenerate && (
            <button 
              onClick={onGenerate} 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem' }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="glass-card" 
      style={{ height: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', scrollBehavior: 'smooth' }}
    >
      <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Transcript</h3>
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
              alert('Failed to download transcript. Please try again.');
            } finally {
              setDownloading(false);
            }
          }}
          disabled={downloading}
          className="btn btn-secondary"
          style={{ 
            padding: '0.4rem 0.8rem', 
            fontSize: '0.8rem', 
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          {downloading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
          {downloading ? 'Preparing...' : 'Download PDF'}
        </button>
      </div>
      
      {segments.map((segment, idx) => {
        const isActive = activeTime >= segment.startTime && activeTime < (segments[idx + 1]?.startTime || segment.endTime + 5);
        
        return (
          <div 
            key={idx}
            ref={isActive ? activeSegmentRef : null}
            onClick={() => onTimestampClick(segment.startTime)}
            style={{
              display: 'flex', 
              gap: '1rem', 
              padding: '0.75rem 0.5rem', 
              paddingTop: idx === 0 ? '0.5rem' : '0.75rem',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              borderLeft: isActive ? '4px solid var(--accent-primary)' : '4px solid transparent',
              transition: 'all 0.3s ease',
              transform: isActive ? 'translateX(5px)' : 'none',
              marginLeft: isActive ? '-4px' : '0',
              paddingLeft: isActive ? 'calc(0.5rem + 4px)' : '0.5rem'
            }}
            onMouseOver={(e) => {
               if(!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            }}
            onMouseOut={(e) => {
               if(!isActive) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{ color: 'var(--accent-primary)', fontFamily: 'monospace', fontSize: '0.85rem', flexShrink: 0, fontWeight: isActive ? 'bold' : 'normal' }}>
              [{formatTime(segment.startTime)}]
            </span>
            <span style={{ 
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', 
              fontSize: '0.95rem',
              fontWeight: isActive ? '600' : '400',
              lineHeight: '1.4'
            }}>
              {segment.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
