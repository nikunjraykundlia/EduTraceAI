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
  
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await api.get(`/personal/video/${videoId}`);
        if(res.data.success) {
          setVideo(res.data.video);
          setQuizzes(res.data.quizzes || []);
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
              onGenerate={async () => {
                setSummaryLoading(true);
                try {
                  const res = await api.post('/personal/generate-summary', { videoId });
                  if (res.data.success) {
                    setVideo({ ...video, summary: res.data.summary });
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setSummaryLoading(false);
                }
              }} 
            />
          )}
          {activeTab === 'chat' && <div className="glass-panel" style={{ padding: '0.5rem' }}><ChatInterface videoId={videoId} /></div>}
        </div>
      </div>
      
      {/* Right Column: Transcript */}
      <div>
        <TranscriptPanel 
          segments={video.transcript.segments} 
          onTimestampClick={handleTimestampClick} 
          activeTime={playerInfo.currentTime} 
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
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} color="var(--accent-primary)" />
            Recent Quizzes
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {quizzes.map((q) => (
              <div 
                key={q._id} 
                className="glass-card" 
                onClick={() => router.push(`/personal/quiz/${q._id}`)}
                style={{ padding: '1rem', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}
              >
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.4rem' }}>{q.title}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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

  if (!summary || !summary.shortSummary) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Sparkles size={32} />
        </div>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>AI Summary</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
          Get a high-level overview and key takeaways from this video.
        </p>
        <button onClick={onGenerate} className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
          {loading ? 'Generating Summary...' : 'Generate Summary'}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--accent-primary)' }}>Overview</h3>
        <p style={{ lineHeight: '1.7', color: 'var(--text-primary)' }}>{summary.shortSummary}</p>
        
        {summary.detailedSummary && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--accent-secondary)' }}>Key Details</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>{summary.detailedSummary}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>Main Topics</h4>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-primary)' }}>
            {(summary.keyTopics || []).map((topic, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{topic}</li>)}
          </ul>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>Key Terms</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(summary.keyTerms || []).map((term, i) => (
              <span key={i} className="badge" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>{term}</span>
            ))}
          </div>
        </div>
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button onClick={onGenerate} className="btn btn-secondary" disabled={loading} style={{ fontSize: '0.85rem' }}>
          {loading ? 'Regenerating...' : 'Regenerate Summary'}
        </button>
      </div>
    </div>
  );
}
