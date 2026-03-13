'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video, Edit3, Settings, Users, Plus, Play, User, Mail } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('lectures'); // 'lectures' or 'students'

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'instructor')) {
      router.push('/dashboard');
    }

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

    if (user && user.role === 'instructor') {
      fetchClassroom();
    }
  }, [classId, user, authLoading, router]);

  const handleUploadVideo = async (e) => {
    e.preventDefault();
    if (!videoUrl) return;

    try {
      const response = await api.post(`/classroom/${classId}/video`, {
        youtubeUrl: videoUrl
      });

      if (response.data.success) {
        // Refresh classroom data
        const refreshResponse = await api.get(`/classroom/${classId}`);
        setClassroom(refreshResponse.data.classroom);
        setVideoUrl('');
        setIsUploadModalOpen(false);
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      alert(error.response?.data?.message || 'Failed to upload video');
    }
  };

  if (loading || authLoading || !classroom) return <div style={{ textAlign: 'center', marginTop: '4rem' }}>Loading Classroom...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <Link href="/college/instructor" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>&larr; Back to Dashboard</Link>
          <h1 className="page-title" style={{ fontSize: '2rem' }}>{classroom.name}</h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <span className="badge badge-blue">Code: {classroom.classCode}</span>
            <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={12} /> {classroom.students?.length || 0} Students</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)}>
          <Video size={18} /> Upload Lecture
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setActiveTab('lectures')}
          style={{
            padding: '0.75rem 0.5rem',
            background: 'none',
            border: 'none',
            color: activeTab === 'lectures' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'lectures' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'lectures' ? 'bold' : 'normal'
          }}
        >
          Course Materials
        </button>
        <button
          onClick={() => setActiveTab('students')}
          style={{
            padding: '0.75rem 0.5rem',
            background: 'none',
            border: 'none',
            color: activeTab === 'students' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'students' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'students' ? 'bold' : 'normal'
          }}
        >
          Enrolled Students
        </button>
      </div>

      {activeTab === 'lectures' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {classroom.videos?.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No lectures uploaded yet.</p>
          ) : (
            classroom.videos?.map((vid) => (
              <div key={vid._id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <Play size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{vid.title}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {vid.transcriptVerified ? <span className="badge badge-green">Verified</span> : <span className="badge badge-yellow">Unverified</span>}
                      {vid.quizzes?.length > 0 ? <span className="badge badge-blue">Quiz Ready</span> : <span className="badge badge-red">Needs Quiz</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => router.push(`/college/instructor/${classId}/video/${vid._id}`)}>
                    <Settings size={16} /> Manage
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '0', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {classroom.students?.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Users size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-secondary)' }}>No students have joined this class yet.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Share the invite code to enroll students.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Student</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Email</th>
                    <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {classroom.students?.map((student) => (
                    <tr key={student._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {student.avatar ? <img src={student.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : <User size={16} />}
                          </div>
                          <span>{student.name}</span>
                        </div>
                      </th>
                      <th style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Mail size={14} /> {student.email}
                        </div>
                      </th>
                      <th style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {new Date().toLocaleDateString()}
                      </th>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Video Lecture">
        <form onSubmit={handleUploadVideo}>
          <div className="input-group">
            <label className="input-label">YouTube URL</label>
            <input
              type="url"
              className="input-field"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            We will extract the transcript so you can verify it before publishing.
          </p>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Import Video</button>
        </form>
      </Modal>

    </div>
  );
}
