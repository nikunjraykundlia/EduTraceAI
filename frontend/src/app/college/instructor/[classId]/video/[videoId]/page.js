'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import VideoPlayer from '@/components/video/VideoPlayer';
import { 
  PlayCircle, FileText, MessageSquare, Sparkles, 
  History, Send, ArrowRight, CheckCircle, 
  AlertTriangle, Settings, Plus, Save, Clock, Trash2
} from 'lucide-react';
import Link from 'next/link';

export default function InstructorVideoManagement() {
  const { classId, videoId } = useParams();
  const router = useRouter();
  const [video, setVideo] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quiz');
  const [playerInfo, setPlayerInfo] = useState({ currentTime: 0 });
  const [transcriptEditing, setTranscriptEditing] = useState(false);
  const [editedSegments, setEditedSegments] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const transcriptContainerRef = useRef(null);
  const activeSegmentRef = useRef(null);

  // Auto-scroll logic for transcript
  useEffect(() => {
    if (activeSegmentRef.current && transcriptContainerRef.current && !transcriptEditing) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [playerInfo.currentTime, transcriptEditing]);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await api.get(`/classroom/${classId}`);
        if(res.data.success) {
          const classroom = res.data.classroom;
          const foundVideo = classroom.videos?.find(v => v._id === videoId);
          if (foundVideo) {
             setVideo(foundVideo);
             setEditedSegments(foundVideo.transcript?.segments || []);
             // Filter quizzes for this video
             const videoQuizzes = classroom.quizzes?.filter(q => q.videoId === videoId) || [];
             setQuizzes(videoQuizzes);
          } else {
             router.push(`/college/instructor/${classId}`);
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
  }, [classId, videoId, router]);

  const handlePlayerReady = (event) => {
    playerRef.current = event.target;
    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setPlayerInfo({ currentTime: playerRef.current.getCurrentTime() });
      }
    }, 1000);
  };

  const handleVerifyTranscript = async () => {
    setVerifying(true);
    try {
      const res = await api.put(`/classroom/${classId}/video/${videoId}/transcript`, {
        segments: editedSegments,
        verified: true
      });
      if (res.data.success) {
        setVideo({ ...video, transcriptVerified: true, transcript: res.data.video.transcript });
        setTranscriptEditing(false);
      }
    } catch (err) {
      console.error(err);
      alert('Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    try {
      const res = await api.post(`/classroom/${classId}/generate-quiz`, {
        videoId,
        difficulty: 'medium',
        numMCQs: 5
      });
      if (res.data.success) {
        setQuizzes([res.data.quiz, ...quizzes]);
        setActiveTab('quiz');
      }
    } catch (err) {
      console.error(err);
      alert('Quiz generation failed.');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handlePublishQuiz = async (quizId) => {
    setPublishing(true);
    try {
      const res = await api.put(`/classroom/${classId}/quiz/${quizId}/publish`, {
         timeLimit: 300 // 5 minutes
      });
      if (res.data.success) {
        setQuizzes(quizzes.map(q => q._id === quizId ? { ...q, isPublished: true } : q));
      }
    } catch (err) {
      console.error(err);
      alert('Publishing failed.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!confirm('Permanently delete this evaluation? This action cannot be undone.')) return;
    try {
      const res = await api.delete(`/classroom/${classId}/quiz/${quizId}`);
      if (res.data.success) {
        setQuizzes(quizzes.filter(q => q._id !== quizId));
      }
    } catch (err) {
      console.error(err);
      alert('Deletion failed.');
    }
  };

  if (loading || !video) return <div style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'var(--font-data)' }}>Establishing link...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem 4rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingTop: '1rem' }}>
        <div>
          <Link href={`/college/instructor/${classId}`} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>&larr; Back to Classroom</Link>
          <h1 className="t-h2" style={{ fontSize: '1.75rem' }}>{video.title || 'Untitled Lecture'}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           {video.transcriptVerified ? (
             <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={12}/> Verified</span>
           ) : (
             <span className="badge badge-yellow" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={12}/> Unverified</span>
           )}
        </div>
      </div>

      {/* Row 1: Video & Transcript Sync */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 400px', 
        gap: '2rem', 
        marginBottom: '2rem',
        alignItems: 'start' // Don't stretch by default to let aspect-ratio control Row height
      }}>
        
        {/* Col 1: Video Player (The Height Anchor) */}
        <div style={{ 
          width: '100%',
          aspectRatio: '16/9', 
          background: '#000', 
          border: '1px solid var(--stroke-2)', 
          borderRadius: 'var(--radius-lg)', 
          overflow: 'hidden' 
        }}>
           <VideoPlayer 
             videoId={video.youtubeVideoId} 
             onReady={handlePlayerReady} 
           />
        </div>

        {/* Col 2: Transcript Log (Locked to Video Height) */}
        <div className="glass-panel" style={{ 
          height: '100%', // Stretch to match the Row height (which is anchor by Video's 16:9)
          display: 'flex', 
          flexDirection: 'column', 
          borderRadius: 'var(--radius-lg)', 
          overflow: 'hidden',
          position: 'relative' // Critical for internal absolute scroll
        }}>
           <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--stroke-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
             <h3 style={{ fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>TRANSCRIPT LOG</h3>
             {transcriptEditing ? (
               <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={handleVerifyTranscript} disabled={verifying}>
                 <Save size={14}/> {verifying ? 'Saving...' : 'Save & Verify'}
               </button>
             ) : (
               <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setTranscriptEditing(true)}>
                 <Settings size={14}/> Edit
               </button>
             )}
           </div>

           {/* Internally positioned container that forces local scrollbar matching parent height */}
           <div style={{ flex: 1, position: 'relative' }}>
             <div 
               ref={transcriptContainerRef} 
               style={{ 
                 position: 'absolute',
                 inset: 0,
                 overflowY: 'auto', 
                 padding: '1rem' 
               }}
             >
               {video.transcript?.segments?.map((seg, idx) => {
                 const isActive = playerInfo.currentTime >= seg.startTime && playerInfo.currentTime < (video.transcript.segments[idx+1]?.startTime || 9999);
                 
                 return (
                   <div 
                     key={idx} 
                     ref={isActive ? activeSegmentRef : null}
                     style={{ 
                       marginBottom: '1.5rem', 
                       display: 'flex', 
                       gap: '1rem', 
                       cursor: 'pointer',
                       background: isActive && !transcriptEditing ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                       padding: '0.75rem',
                       borderRadius: 'var(--radius-md)',
                       border: isActive && !transcriptEditing ? '1px solid var(--stroke-1)' : '1px solid transparent',
                       transition: 'all 0.2s ease'
                     }} 
                     onClick={() => playerRef.current?.seekTo(seg.startTime, true)}
                   >
                     <span style={{ fontFamily: 'var(--font-data)', fontSize: '11px', color: 'var(--cyan)', marginTop: '0.2rem', flexShrink: 0 }}>
                       [{Math.floor(seg.startTime / 60).toString().padStart(2, '0')}:{(Math.floor(seg.startTime % 60)).toString().padStart(2, '0')}]
                     </span>
                     {transcriptEditing ? (
                       <textarea 
                         value={editedSegments[idx]?.text || ''}
                         onChange={(e) => {
                           const newSegments = [...editedSegments];
                           newSegments[idx] = { ...newSegments[idx], text: e.target.value };
                           setEditedSegments(newSegments);
                         }}
                         style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--stroke-2)', color: 'var(--text-primary)', padding: '0.5rem', borderRadius: '4px', minHeight: '60px', fontFamily: 'inherit', fontSize: '14px' }}
                       />
                     ) : (
                       <p style={{ fontSize: '15px', color: isActive ? 'var(--cyan)' : 'var(--text-secondary)', fontWeight: isActive ? '500' : '400', lineHeight: '1.6', transition: 'color 0.2s' }}>
                         {seg.text}
                       </p>
                     )}
                   </div>
                 );
               })}
             </div>
           </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Row 2: Evaluation Management */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
           <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--stroke-1)', paddingBottom: '0.5rem' }}>
              <button 
                onClick={() => setActiveTab('quiz')}
                style={{ background: 'none', border: 'none', color: activeTab === 'quiz' ? 'var(--cyan)' : 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer', borderBottom: activeTab === 'quiz' ? '2px solid var(--cyan)' : '2px solid transparent', padding: '0.5rem 0' }}
              >
                Evaluations
              </button>
           </div>

           {activeTab === 'quiz' && (
             <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Classroom Quizzes</h3>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleGenerateQuiz} 
                    disabled={generatingQuiz || !video.transcriptVerified}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    {generatingQuiz ? <Sparkles className="animate-pulse" size={16}/> : <Plus size={16}/>}
                    {generatingQuiz ? 'Generating...' : 'Generate New Quiz'}
                  </button>
                </div>

                {!video.transcriptVerified && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--warning)' }}>Transcript Verification Required:</strong> Please verify the transcript on the right before generating a quiz to ensure accuracy.
                    </p>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                  {quizzes.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No quizzes generated for this lecture yet.
                    </div>
                  ) : (
                    quizzes.map((quiz) => (
                      <div key={quiz._id} className="glass-card" style={{ padding: '1.25rem', border: quiz.isPublished ? '1px solid var(--emerald)' : '1px solid var(--stroke-2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                          <div>
                             <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{quiz.title}</h4>
                             <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{quiz.mcqs?.length || 0} Questions • {quiz.difficulty}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {quiz.isPublished ? (
                              <span className="badge badge-green">Published</span>
                            ) : (
                              <span className="badge badge-yellow">Draft</span>
                            )}
                            <button 
                              onClick={() => handleDeleteQuiz(quiz._id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '4px', transition: 'color 0.2s' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--rose)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                              title="Delete Evaluation"
                            >
                               <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                           {!quiz.isPublished && (
                             <button 
                               className="btn btn-primary" 
                               style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                               onClick={() => handlePublishQuiz(quiz._id)}
                               disabled={publishing}
                             >
                               Publish to Class
                             </button>
                           )}
                           <Link href={`/personal/quiz/${quiz._id}`} className="btn btn-secondary" style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', textAlign: 'center' }}>
                             Preview
                           </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
           )}
        </div>

      </div>

    </div>
  );
}
