'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, CheckCircle, Clock, BookOpen, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function StudentClassroomDetail() {
  const { classId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [classroom, setClassroom] = useState(null);
  const [completedAttempts, setCompletedAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'student')) {
      router.push('/dashboard');
    }

    const fetchClassroomData = async () => {
      try {
        const response = await api.get(`/classroom/${classId}`);
        if (response.data.success) {
          setClassroom(response.data.classroom);
          setCompletedAttempts(response.data.completedAttempts || []);
        }
      } catch (err) {
        console.error('Error fetching classroom:', err);
        setError('Failed to load classroom context.');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'student') {
      fetchClassroomData();
    }
  }, [classId, user, authLoading, router]);

  if (loading || authLoading) return <div style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'var(--font-data)' }}>Establishing link...</div>;
  if (error) return <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--rose)' }}>{error}</div>;
  if (!classroom) return <div style={{ textAlign: 'center', marginTop: '4rem' }}>Classroom logic not found.</div>;

  const publishedQuizzes = classroom.quizzes?.filter(q => q.isPublished) || [];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getAttempt = (quizId) => completedAttempts.find(a => a.quizId === quizId);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      <div style={{ marginBottom: '3.5rem' }}>
         <div style={{ 
           fontSize: '80px', 
           fontWeight: '900', 
           color: 'var(--text-primary)', 
           lineHeight: 1,
           marginBottom: '2rem',
           fontFamily: 'var(--font-display)',
           letterSpacing: '-4px'
         }}>
           {getInitials(classroom.instructorId?.name || 'Dr. Professor')}
         </div>

         <Link href="/college/student" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem', display: 'inline-block', fontWeight: '600', letterSpacing: '0.05em' }}>&larr; BACK TO REGISTRY</Link>
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h1 className="page-title" style={{ fontSize: '3rem', fontWeight: '800', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
              {classroom.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ background: '#003399', color: 'white', padding: '0.5rem 1rem', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
                <UserIcon size={16} /> 
                <span>Instructor:</span> 
                <span style={{ color: 'white' }}>{classroom.instructorId?.name || 'Dr. Professor'}</span>
              </div>
              <div style={{ background: '#003399', color: 'white', padding: '0.5rem 1rem', borderRadius: '2px', fontWeight: '600', fontSize: '14px' }}>
                CODE: {classroom.classCode}
              </div>
            </div>
         </div>
      </div>

      <div style={{ margin: '3rem 0 2rem' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'var(--font-display)' }}>
          <BookOpen size={28} className="text-accent" /> Available Evaluations
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {publishedQuizzes.length === 0 ? (
             <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center' }}>
                <Clock size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p style={{ color: 'var(--text-secondary)' }}>No evaluations have been deployed yet by your instructor.</p>
             </div>
          ) : (
            publishedQuizzes.map((quiz) => {
               const attempt = getAttempt(quiz._id);
               return (
                 <div key={quiz._id} className="glass-card" style={{ borderTop: `4px solid ${attempt ? 'var(--emerald)' : 'var(--accent-primary)'}`, padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>{quiz.title}</h3>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>{quiz.mcqs?.length || 0} Questions</span>
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{quiz.difficulty || 'Medium'}</span>
                        {attempt && <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>COMPLETED</span>}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                       <Link href={`/personal/video/${quiz.videoId}`} className="btn btn-secondary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                          <Play size={14} /> Briefing
                       </Link>
                       {attempt ? (
                         <Link href={`/personal/quiz/${quiz._id}/results?attemptId=${attempt._id}`} className="btn btn-secondary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 201, 140, 0.1)', color: 'var(--emerald)', borderColor: 'rgba(16, 201, 140, 0.3)' }}>
                            View Results
                         </Link>
                       ) : (
                         <Link href={`/personal/quiz/${quiz._id}`} className="btn btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            Attempt Quiz
                         </Link>
                       )}
                    </div>
                 </div>
               );
            })
          )}
        </div>
      </div>

      {classroom.videos?.length > 0 && (
        <div style={{ marginTop: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Play size={24} className="text-secondary" /> Course Lectures
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {classroom.videos.map((vid) => (
              <div key={vid._id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                    <Play size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: '600' }}>{vid.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reference Material</p>
                  </div>
                </div>
                <Link href={`/personal/video/${vid._id}`} className="btn btn-ghost" style={{ padding: '0.5rem 1rem' }}>
                  Watch Video &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

