'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, FileText, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';

export default function StudentDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && user?.role === 'instructor') {
      router.push('/dashboard');
    }

    const fetchClasses = async () => {
      try {
        const response = await api.get('/classroom/student/my-classes');
        if (response.data.success) {
          setClasses(response.data.classrooms);
        }
      } catch (error) {
        console.error('Error fetching student classes:', error);
      }
    };

    if (user && user.role === 'student') {
      fetchClasses();
    }
  }, [user, loading, router]);

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      const response = await api.post('/classroom/join', {
        classCode: joinCode
      });

      if (response.data.success) {
        setClasses([...classes, response.data.classroom]);
        setJoinCode('');
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error joining class:', error);
      alert(error.response?.data?.message || 'Failed to join class');
    }
  };

  if (loading || !user) return <div style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'var(--font-data)' }}>Initializing Node Uplink...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 className="t-h3" style={{ marginBottom: '0.5rem' }}>STUDENT MODULE</h1>
          <p className="t-small" style={{ color: 'var(--text-secondary)' }}>Access enrolled sync nodes and execute pending evaluations.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserPlus size={18} /> Sync to Node
        </button>
      </div>

      <div className="grid-cards">
        {classes.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '5rem 2rem', 
            border: '1px solid var(--stroke-2)', 
            background: 'var(--surface-1)', 
            borderRadius: 'var(--radius-card)' 
          }}>
            <h3 className="t-h4" style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>ZERO ESTABLISHED UPLINKS</h3>
            <p className="t-small" style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Obtain an authentication vector (Join Code) from an instructor to initialize synchronization.</p>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Initialize Link</button>
          </div>
        ) : (
          classes.map((cls) => (
            <div key={cls._id} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'var(--surface-1)', 
              border: '1px solid var(--stroke-2)', 
              borderRadius: 'var(--radius-card)', 
              padding: '1.5rem',
              transition: 'all 0.2s'
            }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{cls.name}</h2>
              <p style={{ fontFamily: 'var(--font-data)', fontSize: '11px', color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Supervisor: {cls.instructorId?.name || 'Unknown'}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--surface-0)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--stroke-1)', textAlign: 'center' }}>
                  <Clock size={16} color="var(--yellow)" style={{ margin: '0 auto 0.5rem' }} />
                  <span style={{ fontFamily: 'var(--font-display)', display: 'block', fontSize: '24px', fontWeight: 'bold' }}>{cls.quizzes?.length || 0}</span>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Pending Arrays</span>
                </div>
                <div style={{ background: 'var(--surface-0)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--stroke-1)', textAlign: 'center' }}>
                  <CheckCircle size={16} color="var(--emerald)" style={{ margin: '0 auto 0.5rem' }} />
                  <span style={{ fontFamily: 'var(--font-display)', display: 'block', fontSize: '24px', fontWeight: 'bold' }}>0</span>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Executed</span>
                </div>
              </div>

              <Link href={`/college/student/${cls._id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Access Matrix
              </Link>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Establish Node Sync">
        <form onSubmit={handleJoinClass}>
          <div className="input-group">
            <label className="input-label" style={{ fontFamily: 'var(--font-data)', textTransform: 'uppercase', fontSize: '11px', color: 'var(--text-secondary)' }}>Node authentication key</label>
            <input
              type="text"
              className="input-field"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. ABCD-1234"
              required
              style={{ fontFamily: 'var(--font-data)' }}
            />
          </div>
          <p style={{ fontFamily: 'var(--font-data)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Input the specific cryptographic identifier assigned by your instructor to establish authorization.
          </p>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontFamily: 'var(--font-data)', textTransform: 'uppercase' }}>Initialize Sync</button>
        </form>
      </Modal>

    </div>
  );
}
