'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import VideoPlayer from '@/components/video/VideoPlayer';
import TranscriptPanel from '@/components/video/TranscriptPanel';
import { PlayCircle, FileText, MessageSquare, Sparkles, History, Send } from 'lucide-react';
import ChatInterface from '@/components/chat/ChatInterface';

export default function VideoAnalysisPage() {
  const { videoId } = useParams();
  const router = useRouter();
  const [video, setVideo] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quiz');
  const [playerInfo, setPlayerInfo] = useState({ currentTime: 0 });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await api.get(`/personal/video/${videoId}`);
        if(res.data.success) {
          const fetchedVideo = res.data.video;
          setVideo(fetchedVideo);
          setQuizzes(res.data.quizzes || []);

          // Auto-generate transcript if segments are missing
          if (!fetchedVideo.transcript?.segments || fetchedVideo.transcript.segments.length === 0) {
            setTranscriptLoading(true);
            try {
              const tRes = await api.post('/personal/generate-transcript', { videoId });
              if (tRes.data.success) {
                setVideo(prev => ({ ...prev, transcript: tRes.data.transcript }));
              }
            } catch (tErr) {
              console.error('Auto-transcript failed:', tErr);
            } finally {
              setTranscriptLoading(false);
            }
          }
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchVideo();
    
    return () => clearInterval(intervalRef.current);
  }, [videoId]);

  const handlePlayerReady = (event) => {
    playerRef.current = event.target;
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setPlayerInfo({ currentTime: playerRef.current.getCurrentTime() });
      }
    }, 1000);
  };

  const handleTimestampClick = (seconds) => {
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
    }
  };

  const handleGenerateTranscript = async () => {
    setTranscriptLoading(true);
    try {
      const res = await api.post('/personal/generate-transcript', { videoId });
      if (res.data.success) {
        setVideo({ ...video, transcript: res.data.transcript });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate transcript. Please try again.');
    } finally {
      setTranscriptLoading(false);
    }
  };

  const handleGenerateSummary = async (mode = 'summary') => {
    setSummaryLoading(true);
    try {
      const res = await api.post('/personal/generate-summary', { videoId, mode });
      if (res.data.success) {
        setVideo({ ...video, summary: res.data.summary });
      }
    } catch (err) {
      console.error(`Error generating ${mode}:`, err);
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading || !video) return <div style={{ textAlign: 'center', marginTop: '4rem' }}>Loading video data...</div>;

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
      
      {/* Left Column: Video & Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '0.5rem', overflow: 'hidden' }}>
           <VideoPlayer 
             videoId={video.youtubeVideoId} 
             onReady={handlePlayerReady} 
           />
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <TabButton active={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} icon={<PlayCircle size={18} />} label="Take Quiz" />
          <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<FileText size={18} />} label="Summary" />
          <TabButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageSquare size={18} />} label="AI Doubt Resolver" />
        </div>
        
        <div className="tab-content" style={{ minHeight: '400px' }}>
          {activeTab === 'quiz' && <QuizGeneratorTab videoId={videoId} quizzes={quizzes} onQuizGenerated={(newQuiz) => setQuizzes([newQuiz, ...quizzes])} />}
          {activeTab === 'summary' && (
            <SummaryTab 
              video={video} 
              loading={summaryLoading} 
              onGenerate={handleGenerateSummary} 
            />
          )}
          {activeTab === 'chat' && (
            <div className="glass-panel" style={{ padding: '0.5rem' }}>
              <ChatInterface videoId={video.youtubeVideoId} />
            </div>
          )}
        </div>
      </div>
      
      {/* Right Column: Transcript */}
      <div>
        <TranscriptPanel 
          segments={video.transcript?.segments || []} 
          onTimestampClick={handleTimestampClick} 
          activeTime={playerInfo.currentTime} 
          loading={transcriptLoading}
          onGenerate={handleGenerateTranscript}
          title={video.title}
          youtubeUrl={video.youtubeUrl}
        />
      </div>

    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.75rem 1.25rem',
        background: active ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: active ? '600' : '500',
        transition: 'all 0.2s'
      }}
    >
      <span style={{ color: active ? 'var(--accent-primary)' : 'inherit' }}>{icon}</span>
      {label}
    </button>
  );
}

function QuizGeneratorTab({ videoId, quizzes, onQuizGenerated }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const generateQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/personal/generate-quiz', { videoId, difficulty: 'medium' });
      if (res.data.success && res.data.quiz) {
         onQuizGenerated(res.data.quiz);
         router.push(`/personal/quiz/${res.data.quiz._id}`);
      } else {
        throw new Error('Quiz generation failed or returned no data.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate quiz. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* History section */}
      {quizzes.length > 0 && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} color="var(--accent-primary)" />
            Recent Quizzes
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {quizzes.map((q) => (
              <div 
                key={q._id} 
                className="glass-card" 
                onClick={() => {
                  if (q.isCompleted && q.completedAttemptId) {
                    router.push(`/personal/quiz/${q._id}/results?attemptId=${q.completedAttemptId}`);
                  } else {
                    router.push(`/personal/quiz/${q._id}`);
                  }
                }}
                style={{ padding: '1.5rem', cursor: 'pointer', border: `1px solid ${q.isCompleted ? 'var(--success)' : 'var(--border-color)'}`, background: q.isCompleted ? 'rgba(46, 204, 113, 0.05)' : 'rgba(255,255,255,0.02)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600', lineHeight: 1.3, flex: 1, marginRight: '0.5rem' }}>{q.title}</h4>
                  {q.isCompleted && (
                    <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem', whiteSpace: 'nowrap' }}>Submitted ✓</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  <span>{q.totalMCQs} MCQs</span>
                  <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generator block */}
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        {error && (
          <div className="badge badge-red" style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
            {error}
          </div>
        )}
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <PlayCircle size={32} />
        </div>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Generate Auto-Quiz</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          Test your understanding. We'll generate 5 MCQs based exactly on the transcript.
        </p>
        <button onClick={generateQuiz} className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
          {loading ? 'AI is analyzing transcript...' : 'Generate New Quiz'}
        </button>
      </div>
    </div>
  );
}

function SummaryTab({ video, loading, onGenerate }) {
  const summary = video?.summary;
  const videoId = video?.youtubeVideoId;

  const convertTimestampToSeconds = (timestamp) => {
    const parts = timestamp.split(':');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  };

  const extractAllTimestamps = (timestampRange) => {
    if (!timestampRange) return [];
    // Split by comma to get multiple ranges
    const ranges = timestampRange.split(',').map(range => range.trim());
    // Extract start times from each range
    return ranges.map(range => {
      const startTime = range.split('-')[0].trim();
      return {
        display: startTime,
        seconds: convertTimestampToSeconds(startTime)
      };
    });
  };

  const renderFormattedText = (text) => {
    if (!text) return null;
    
    // Split by double newlines for paragraphs
    return text.split('\n\n').map((para, i) => {
      // Check if it's a list
      if (para.includes('\n- ') || para.startsWith('- ')) {
        const lines = para.split('\n');
        const listItems = lines.filter(line => line.trim().startsWith('- '));
        const intro = lines.find(line => !line.trim().startsWith('- '));

        return (
          <div key={i} style={{ marginBottom: '1.25rem' }}>
            {intro && <p style={{ marginBottom: '0.75rem', fontWeight: '500' }}>{intro}</p>}
            <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {listItems.map((item, j) => {
                const cleaned = item.trim().substring(2);
                // Handle **bold** text
                const parts = cleaned.split(/(\*\*.*?\*\*)/g);
                return (
                  <li key={j} style={{ color: 'var(--text-primary)', lineHeight: '1.5' }}>
                    {parts.map((part, k) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={k} style={{ color: 'var(--accent-primary)' }}>{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    })}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }

      // Regular paragraph with bolding
      const parts = para.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} style={{ marginBottom: '1.25rem', lineHeight: '1.7', color: 'var(--text-primary)' }}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} style={{ color: 'var(--accent-primary)' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  if (!summary || (!summary.shortSummary && !summary.doubts)) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', background: 'var(--accent-gradient)', opacity: 0.05, borderRadius: '50%', filter: 'blur(40px)' }}></div>
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', transform: 'rotate(-5deg)', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
          <Sparkles size={40} />
        </div>
        <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Intelligence Hub</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '450px', margin: '0 auto 2.5rem', fontSize: '1.1rem', lineHeight: '1.6' }}>
          Deeply analyze this video's content. We'll extract core concepts, provide evidence-based summaries, and resolve potential doubts.
        </p>
        <button 
          onClick={() => onGenerate('summary')} 
          className="btn btn-primary" 
          disabled={loading} 
          style={{ padding: '1rem 3rem', fontSize: '1.1rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)' }}
        >
          {loading ? (
            <>
              <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              Analyzing Content...
            </>
          ) : 'Unlock AI Analysis'}
        </button>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Summary Section */}
      {summary.shortSummary && (
        <div className="glass-panel" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-gradient)' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', color: 'var(--accent-primary)' }}>
                <FileText size={20} />
              </div>
              Executive Summary
            </h3>
            <span className="badge badge-blue">AI Generated</span>
          </div>

          <div className="summary-content">
            {renderFormattedText(summary.shortSummary)}
          </div>
          
          {summary.summaryCitation && (
            <div style={{ 
              marginTop: '2rem', 
              padding: '1.25rem', 
              background: 'rgba(255, 255, 255, 0.03)', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--accent-primary)', opacity: 0.8 }}>
                <Sparkles size={12} />
                Evidence-Based Grounding
              </div>
              {summary.summaryCitation.evidence && (
                <p style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: '1.5', borderLeft: '2px solid var(--accent-primary)', paddingLeft: '1rem' }}>
                  "{summary.summaryCitation.evidence}"
                </p>
              )}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span><strong>Timestamp:</strong> {summary.summaryCitation.timestampRange}</span>
                <span>•</span>
                <span><strong>Video:</strong> {summary.summaryCitation.youtubeVideoTitle}</span>
              </div>
            </div>
          )}
        </div>
      )}

      
      {/* Bottom Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
        <button 
          onClick={() => onGenerate('summary')} 
          className="btn btn-secondary" 
          disabled={loading}
          style={{ padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Sparkles size={16} />
          {loading ? 'Refreshing...' : 'Regenerate Summary'}
        </button>
      </div>
    </div>
  );
}
