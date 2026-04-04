'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Video, Edit3, Settings, Users, Plus, Play, 
  User as UserIcon, Mail, BookOpen, Clock, 
  BarChart3, Layout, ChevronRight, Sparkles
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function InstructorClassroomDetail() {
  const { classId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('lectures'); // 'lectures', 'quizzes', 'students'

  const fetchClassroom = async () => {
    try {
      const response = await api.get(`/classroom/${classId}`);
      if (response.data.success) {
        setClassroom(response.data.classroom);
      }
    } catch (error) {
      console.error('Error fetching classroom:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'instructor')) {
      router.push('/dashboard');
    }

    if (user && user.role === 'instructor') {
      fetchClassroom();
    }
  }, [classId, user, authLoading, router]);

  const handleUploadVideo = async (e) => {
    e.preventDefault();
    if (!videoUrl) return;
    setUploading(true);

    try {
      const response = await api.post(`/classroom/${classId}/video`, {
        youtubeUrl: videoUrl
      });

      if (response.data.success) {
        await fetchClassroom();
        setVideoUrl('');
        setIsUploadModalOpen(false);
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      alert(error.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  if (loading || authLoading || !classroom) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
      <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-data)' }}>SYNCHRONIZING HUB...</p>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '5rem' }}>

      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <Link href="/college/instructor" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
            &larr; BACK TO REGISTRY
          </Link>
          <h1 className="page-title" style={{ fontSize: '2.75rem', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>{classroom.name}</h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
            <span className="badge badge-cyan" style={{ letterSpacing: '0.05em' }}>ID: {classroom.classCode}</span>
            <span className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Users size={12} /> {classroom.students?.length || 0} ENROLLED</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href={`/college/instructor/${classId}/analytics`} className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem' }}>
            <BarChart3 size={18} /> Performance Dashboard
          </Link>
          <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)} style={{ padding: '0.75rem 1.25rem' }}>
            <Plus size={18} /> Deploy Lecture
          </button>
        </div>
      </div>

      {/* Primary Tabs */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--stroke-1)' }}>
        {[
          { id: 'lectures', label: 'Lectures', icon: <Video size={16} /> },
          { id: 'quizzes', label: 'Evaluations', icon: <BookOpen size={16} /> },
          { id: 'students', label: 'Student Directory', icon: <Users size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '1rem 0.5rem',
              background: 'none',
              border: 'none',
              color: activeTab === tab.id ? 'var(--cyan)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--cyan)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon} {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-container">
        {activeTab === 'lectures' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {classroom.videos?.length === 0 ? (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
                <Video size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No lecture data available</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '300px', margin: '0 auto 2rem' }}>Initiate the course by uploading instructional video content.</p>
                <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)}>Import First Lecture</button>
              </div>
            ) : (
              classroom.videos?.map((vid) => (
                <div key={vid._id} className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--stroke-2)' }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: 'var(--surface-3)' }}>
                    <img src={`https://img.youtube.com/vi/${vid.youtubeVideoId}/hqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}></div>
                    <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
                       <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.25rem' }}>{vid.title}</h3>
                       <div style={{ display: 'flex', gap: '0.5rem' }}>
                         {vid.transcriptVerified ? <span className="badge badge-green" style={{ fontSize: '10px' }}>VERIFIED</span> : <span className="badge badge-yellow" style={{ fontSize: '10px' }}>PENDING</span>}
                         {classroom.quizzes?.some(q => q.videoId === vid._id) && <span className="badge badge-blue" style={{ fontSize: '10px' }}>QUIZ ACTIVE</span>}
                       </div>
                    </div>
                  </div>
                  <div style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Created {new Date(vid.createdAt).toLocaleDateString()}</p>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => router.push(`/college/instructor/${classId}/video/${vid._id}`)}>
                      Manage Context &rarr;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="glass-panel" style={{ padding: '0', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--stroke-1)' }}>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>EVALUATION TARGET</th>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>METRICS</th>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>STATUS</th>
                  <th style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem', letterSpacing: '0.1em' }}></th>
                </tr>
              </thead>
              <tbody>
                {classroom.quizzes?.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No evaluation matrices have been generated for this Hub.</td>
                  </tr>
                ) : (
                  classroom.quizzes.map((quiz) => (
                    <tr key={quiz._id} style={{ borderBottom: '1px solid var(--stroke-1)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <h4 style={{ fontWeight: '600' }}>{quiz.title}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Source: {classroom.videos?.find(v => v._id === quiz.videoId)?.title || 'Video Archive'}</p>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'var(--font-data)', fontSize: '0.9rem' }}>
                        {quiz.mcqs?.length || 0} Nodes • {quiz.difficulty.toUpperCase()}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        {quiz.isPublished ? (
                          <span className="badge badge-green">LIVE</span>
                        ) : (
                          <span className="badge badge-yellow">DRAFT</span>
                        )}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <Link href={`/college/instructor/${classId}/video/${quiz.videoId}`} className="btn btn-ghost" style={{ padding: '0.4rem' }}>
                          <Settings size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Enrolled Operatives</h3>
                <div className="badge badge-cyan">{classroom.students?.length || 0} TOTAL</div>
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
               {classroom.students?.length === 0 ? (
                 <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                   <UserIcon size={48} style={{ margin: '0 auto 1rem' }} />
                   <p>No student data found in this registry.</p>
                 </div>
               ) : (
                 classroom.students.map((student) => (
                   <div key={student._id} style={{ padding: '1.25rem', border: '1px solid var(--stroke-1)', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--cyan)' }}>
                        {student.name.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.email}</p>
                      </div>
                      <Link href={`/college/instructor/${classId}/analytics/student/${student._id}`} style={{ color: 'var(--text-muted)' }}>
                        <ChevronRight size={16} />
                      </Link>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}
      </div>

      <Modal isOpen={isUploadModalOpen} onClose={() => !uploading && setIsUploadModalOpen(false)} title="Deploy Instructional Lecture">
        <form onSubmit={handleUploadVideo}>
          <div className="input-group">
            <label className="input-label">YouTube Source URL</label>
            <div style={{ position: 'relative' }}>
              <input
                type="url"
                className="input-field mono"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                disabled={uploading}
                required
                style={{ paddingRight: '3rem' }}
              />
              <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                <Video size={18} />
              </div>
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(6, 200, 216, 0.05)', 
            border: '1px solid rgba(6, 200, 216, 0.1)', 
            borderRadius: 'var(--radius-input)', 
            padding: '1rem', 
            marginBottom: '2rem',
            display: 'flex',
            gap: '0.75rem'
          }}>
            <Sparkles size={18} color="var(--cyan)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Our system will automatically synthesize semantic transcript data. <strong style={{ color: 'var(--text-primary)' }}>Instructor verification</strong> is required prior to evaluation matrix generation.
            </p>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px' }} disabled={uploading || !videoUrl}>
            {uploading ? (
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                 <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                 INGESTING SOURCE...
               </div>
            ) : (
              'INITIATE DEPLOYMENT'
            )}
          </button>
        </form>
      </Modal>

    </div>
  );
}

