'use client';

import { useAuth } from '@/context/AuthContext';
import { useCoins } from '@/context/CoinsContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, GraduationCap, Video, Trophy, BarChart3 } from 'lucide-react';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { coins } = useCoins();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading || !user) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>Loading...</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user.name.split(' ')[0]}!</h1>
        <p className="page-description">What would you like to learn today?</p>
      </div>

      {/* Stats Summary row */}
      <div className="grid-cards" style={{ marginBottom: '3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(251, 191, 36, 0.1)', color: 'var(--coin-gold)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <Trophy size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Coins Balance</p>
            <h3 style={{ fontSize: '1.5rem' }}>{coins}</h3>
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Quizzes Taken</p>
            <h3 style={{ fontSize: '1.5rem' }}>{user.quizzesTaken || 0}</h3>
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Average Score</p>
            <h3 style={{ fontSize: '1.5rem' }}>{(user.averageScore || 0).toFixed(0)}%</h3>
          </div>
        </div>
      </div>

      <h2 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Select Mode</h2>

      <div className="grid-cards">
        {/* Personal Mode - Only for Students */}
        {user.role === 'student' && (
          <Link href="/personal">
            <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', borderTop: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Video color="var(--accent-primary)" size={28} />
                <h3 style={{ fontSize: '1.5rem' }}>Personal Mode</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', flex: 1 }}>
                Self-paced learning. Paste any educational YouTube URL, instantly extract the transcript, and generate interactive quizzes and summaries.
              </p>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="badge badge-blue">Self-Paced</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>Start Learning &rarr;</span>
              </div>
            </div>
          </Link>
        )}

        {/* College Mode */}
        <Link href={user.role === 'instructor' ? '/college/instructor' : '/college/student'}>
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', borderTop: '4px solid var(--warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <GraduationCap color="var(--warning)" size={28} />
              <h3 style={{ fontSize: '1.5rem' }}>College Mode</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', flex: 1 }}>
              Structured learning. {user.role === 'instructor' ? 'Create and manage classrooms, assign verified videos, publish quizzes, and view analytics.' : 'Join your instructor\'s classrooms, watch verified lectures, and complete assigned quizzes.'}
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-yellow">Classroom</span>
              <span style={{ color: 'var(--warning)', fontWeight: '500' }}>Enter Classroom &rarr;</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
