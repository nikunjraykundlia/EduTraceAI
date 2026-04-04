'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, FileText, CheckCircle, Clock, Link2 } from 'lucide-react';
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

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
          <UserPlus size={18} /> Join Classroom
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
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--stroke-2)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '2rem',
              transition: 'all 0.2s',
              position: 'relative'
            }}>
              {/* Initials Logo */}
              <div style={{ 
                fontFamily: 'var(--font-display)', 
                fontSize: '28px', 
                fontWeight: '900', 
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
                letterSpacing: '-1px'
              }}>
                {getInitials(cls.instructorId?.name || 'Dr. Professor')}
              </div>

              <p style={{ 
                fontFamily: 'var(--font-data)', 
                fontSize: '11px', 
                color: 'var(--cyan)', 
                textTransform: 'uppercase', 
                marginBottom: '2rem',
                letterSpacing: '0.1em',
                fontWeight: '700'
              }}>
                SUPERVISOR: <span style={{ color: 'var(--cyan)' }}>{cls.instructorId?.name || 'Unknown'}</span>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--stroke-1)', textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', display: 'block', fontSize: '28px', fontWeight: '900', marginBottom: '0.5rem' }}>{cls.stats?.pending || 0}</span>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Pending</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--stroke-1)', textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', display: 'block', fontSize: '28px', fontWeight: '900', marginBottom: '0.5rem' }}>{cls.stats?.completed || 0}</span>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Executed</span>
                </div>
              </div>

              <Link href={`/college/student/${cls._id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '14px' }}>
                Access Classroom
              </Link>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Establish Node Uplink">
        <form onSubmit={handleJoinClass}>
          <div className="input-group">
            <label className="input-label">Cryptographic Join Key</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field mono"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. XXXX-XXXX-XXXX"
                required
                style={{ textAlign: 'center', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '1.1rem', padding: '1.25rem' }}
              />
              <div style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }}>
                <Link2 size={18} />
              </div>
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(79, 110, 247, 0.05)', 
            border: '1px solid rgba(79, 110, 247, 0.1)', 
            borderRadius: 'var(--radius-input)', 
            padding: '1rem', 
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Input the specific cryptographic identifier assigned by your instructor to establish authorization and synchronize with the classroom Hub.
            </p>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '52px', fontSize: '14px', letterSpacing: '0.05em' }}>
            AUTHORIZE CLASSROOM
          </button>
        </form>
      </Modal>

    </div>
  );
}
