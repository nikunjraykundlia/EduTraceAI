import { useRef, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';

export default function TranscriptPanel({ segments, onTimestampClick, activeTime, loading, onGenerate }) {
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
      <h3 style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>Transcript</h3>
      
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
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              borderLeft: isActive ? '4px solid var(--accent-primary)' : '4px solid transparent',
              transition: 'all 0.3s ease',
              transform: isActive ? 'translateX(5px)' : 'none'
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
