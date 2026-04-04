'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Users, Plus, Video, Copy, ExternalLink, Activity, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Link from 'next/link';
import api from '@/lib/api';

export default function InstructorDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [isDeleting, setIsDeleting] = useState(null);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classroom/instructor/my-classes');
      if (response.data.success) {
        setClasses(response.data.classrooms);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  useEffect(() => {
    if (!loading && user?.role !== 'instructor') {
      router.push('/dashboard');
    }

    if (user && user.role === 'instructor') {
      fetchClasses();
    }
  }, [user, loading, router]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      const response = await api.post('/classroom/create', {
        name: newClassName,
        description: '' // Optional description
      });

      if (response.data.success) {
        setClasses([...classes, response.data.classroom]);
        setNewClassName('');
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error creating class:', error);
      alert(error.response?.data?.message || 'Failed to create class');
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete "${className}"? This action cannot be undone and all associated quizzes/videos will be lost.`)) {
      return;
    }

    setIsDeleting(classId);
    try {
      const response = await api.delete(`/classroom/${classId}`);
      if (response.data.success) {
        setClasses(classes.filter(cls => cls._id !== classId));
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      alert(error.response?.data?.message || 'Failed to delete class');
    } finally {
      setIsDeleting(null);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Execution Code replicated in clipboard.');
  };

  if (loading || !user) return <div style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'var(--font-data)' }}>Initializing Instructor Matrix...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 className="t-h3" style={{ marginBottom: '0.5rem' }}>INSTRUCTOR MATRIX</h1>
          <p className="t-small" style={{ color: 'var(--text-secondary)' }}>Supervise student nodes and deploy learning variables.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Initialize Class
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
            <h3 className="t-h4" style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>ZERO ACTIVE NODES</h3>
            <p className="t-small" style={{ color: 'var(--text-secondary)' }}>Initialize your first class to instantiate evaluation pipelines.</p>
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
              transition: 'all 0.2s',
              cursor: 'default',
              position: 'relative'
            }}>
              <button 
                onClick={() => handleDeleteClass(cls._id, cls.name)}
                disabled={isDeleting === cls._id}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  color: isDeleting === cls._id ? 'var(--text-muted)' : 'var(--rose)',
                  cursor: isDeleting === cls._id ? 'not-allowed' : 'pointer',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                className="delete-btn-hover"
                title="Decommission Node"
              >
                <Trash2 size={16} />
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', paddingRight: '2.5rem', color: 'var(--text-primary)', fontWeight: '600' }}>{cls.name}</h2>
                <div className="badge badge-cyan" style={{ fontFamily: 'var(--font-data)', position: 'absolute', bottom: '1.5rem', left: '1.5rem', opacity: 0.8, fontSize: '10px' }}>{cls.students?.length || 0} Nodes</div>
              </div>

              <div style={{ 
                background: 'var(--surface-0)', 
                padding: '1.25rem', 
                borderRadius: 'var(--radius-sm)', 
                border: '1px solid var(--stroke-1)',
                marginBottom: '2.5rem', 
                marginTop: '1rem',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <div>
                  <span className="t-small" style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase', fontSize: '10px' }}>Join Key</span>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: '18px', fontWeight: 'bold', color: 'var(--cyan)' }}>{cls.classCode}</span>
                </div>
                <button className="btn btn-secondary" onClick={() => copyCode(cls.classCode)} style={{ padding: '0.5rem 0.75rem' }} title="Replicate Key">
                  <Copy size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                <Link href={`/college/instructor/${cls._id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '14px' }}>
                  Manage Hub
                </Link>
                <Link href={`/college/instructor/${cls._id}/analytics`} className="btn btn-secondary" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Query Telemetry">
                  <Activity size={18} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initialize New Classroom">
        <form onSubmit={handleCreateClass}>
          <div className="input-group">
            <label className="input-label">Academic Identity</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. Advanced Operating Systems"
                required
              />
              <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                <Users size={18} />
              </div>
            </div>
          </div>
          
          <div style={{ 
            background: 'var(--surface-2)', 
            borderRadius: 'var(--radius-input)', 
            padding: '1rem', 
            marginBottom: '2rem',
            border: '1px solid var(--stroke-1)'
          }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Initializing a new classroom establishes a dedicated environment for lecture distribution, student tracking, and AI-driven evaluation deployment.
            </p>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '48px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Instantiate Classroom
          </button>
        </form>
      </Modal>

      <style jsx>{`
        .delete-btn-hover:hover {
          background: rgba(255, 50, 100, 0.1);
        }
      `}</style>

    </div>
  );
}

