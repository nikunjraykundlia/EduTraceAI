'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import VideoPlayer from '@/components/video/VideoPlayer';
import TranscriptPanel from '@/components/video/TranscriptPanel';
import { PlayCircle, FileText, MessageSquare, Sparkles, History, Send, ArrowRight } from 'lucide-react';
import ChatInterface from '@/components/chat/ChatInterface';
import './VideoAnalysis.css';

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

  if (loading || !video) return <div style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'var(--font-data)' }}>Establishing link...</div>;

  return (
    <div className="video-focus-grid">
      
      {/* Left Column: Video & Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="video-player-container">
           <VideoPlayer 
             videoId={video.youtubeVideoId} 
             onReady={handlePlayerReady} 
           />
        </div>
        
        <div className="tabs-container">
          <button className={`video-tab ${activeTab === 'quiz' ? 'active' : ''}`} onClick={() => setActiveTab('quiz')}>
            <PlayCircle size={14} /> Evaluation
          </button>
          <button className={`video-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
            <FileText size={14} /> Summary
          </button>
          <button className={`video-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            <MessageSquare size={14} /> AI Context
          </button>
        </div>
        
        <div className="tab-content-area" style={{ padding: '1.5rem' }}>
          {activeTab === 'quiz' && <QuizGeneratorTab videoId={videoId} quizzes={quizzes} onQuizGenerated={(newQuiz) => setQuizzes([newQuiz, ...quizzes])} />}
          {activeTab === 'summary' && (
            <SummaryTab 
              video={video} 
              loading={summaryLoading} 
              onGenerate={handleGenerateSummary} 
            />
          )}
          {activeTab === 'chat' && (
            <div style={{ height: '600px' }}>
              <ChatInterface videoId={videoId} />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Generator block */}
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        {error && (
          <div className="badge badge-red" style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
            {error}
          </div>
        )}
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--cyan)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <PlayCircle size={24} />
        </div>
        <h3 className="t-h3" style={{ marginBottom: '0.5rem' }}>Knowledge Extraction Protocol</h3>
        <p className="t-small" style={{ marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          Initialize automated evaluation matrix. Generate 5 targeted queries based strictly on the transcript index.
        </p>
        <button onClick={generateQuiz} className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 2rem' }}>
          {loading ? 'Compiling matrix...' : (
            <>Deploy Evaluation <ArrowRight size={16}/></>
          )}
        </button>
      </div>

      {quizzes.length > 0 && (
        <div style={{ borderTop: '1px solid var(--stroke-1)', paddingTop: '1.5rem' }}>
          <h3 className="t-label" style={{ marginBottom: '1.5rem', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={14} />
            Historical Evaluations
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {quizzes.map((q) => (
              <div 
                key={q._id} 
                onClick={() => {
                  if (q.isCompleted && q.completedAttemptId) {
                    router.push(`/personal/quiz/${q._id}/results?attemptId=${q.completedAttemptId}`);
                  } else {
                    router.push(`/personal/quiz/${q._id}`);
                  }
                }}
                style={{ 
                  padding: '1rem', cursor: 'pointer', 
                  border: `1px solid ${q.isCompleted ? 'var(--emerald)' : 'var(--stroke-2)'}`, 
                  background: q.isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-2)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '0.2rem', fontFamily: 'var(--font-data)' }}>{q.title}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
                    <span>{q.totalMCQs} Nodes</span>
                    <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {q.isCompleted && (
                  <span className="badge badge-green" style={{ fontSize: '10px' }}>✓ Processed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTab({ video, loading, onGenerate }) {
  const summary = video?.summary;
  const videoId = video?.youtubeVideoId;

  const renderFormattedText = (text) => {
    if (!text) return null;
    return text.split('\n\n').map((para, i) => {
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
                const parts = cleaned.split(/(\*\*.*?\*\*)/g);
                return (
                  <li key={j} style={{ color: 'var(--text-primary)', lineHeight: '1.5' }}>
                    {parts.map((part, k) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={k} style={{ color: 'var(--cyan)' }}>{part.slice(2, -2)}</strong>;
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

      const parts = para.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} style={{ color: 'var(--cyan)' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  if (!summary || (!summary.shortSummary && !summary.doubts)) {
    return (
      <div className="ai-hub-container">
        <div style={{ color: 'var(--cyan)', marginBottom: '1rem' }}>
          <Sparkles size={32} />
        </div>
        <h3 className="t-h3" style={{ marginBottom: '0.5rem' }}>Semantic Indexing</h3>
        <p className="t-small" style={{ marginBottom: '2rem', maxWidth: '300px' }}>
          Compile a dense semantic map of the structural data. Extracts core concepts and actionable intelligence.
        </p>
        <button 
          onClick={() => onGenerate('summary')} 
          className="btn btn-primary" 
          disabled={loading} 
        >
          {loading ? 'Indexing context...' : 'Initiate Indexing'}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {summary.shortSummary && (
        <div style={{ position: 'relative' }}>
          <h3 className="t-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cyan)', borderBottom: '1px solid var(--stroke-2)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
            <FileText size={14} />
            Semantic Layout
          </h3>

          <div className="summary-body">
            {renderFormattedText(summary.shortSummary)}
          </div>
          
          {summary.summaryCitation && (
            <div style={{ 
              marginTop: '2rem', 
              padding: '1rem', 
              background: 'var(--surface-2)', 
              borderLeft: '2px solid var(--stroke-3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-data)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--cyan)' }}>
                <Sparkles size={12} /> Root Evidence
              </div>
              {summary.summaryCitation.evidence && (
                <p style={{ fontFamily: 'var(--font-editorial)', fontSize: '16px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  "{summary.summaryCitation.evidence}"
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
