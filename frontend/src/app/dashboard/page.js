'use client';

import { useAuth } from '@/context/AuthContext';
import { useCoins } from '@/context/CoinsContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { BookOpen, GraduationCap, Video, Trophy, BarChart3, ArrowRight } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { coins } = useCoins();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  const handleMouseMove = (e, ref) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.setProperty('--mouse-x', `${x}px`);
    ref.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const personalCardRef = useRef(null);
  const collegeCardRef = useRef(null);

  if (loading || !user) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>Loading...</div>;

  return (
    <div className="dashboard-container">
      <div className="greeting-wrapper">
        <div className="eyebrow-text">
          <span style={{ color: 'var(--stroke-2)' }}>//</span> DASHBOARD ACCESS GRANTED
        </div>
        <h1 className="greeting-title">
          Welcome back, <span className="name-gradient">{user.name.split(' ')[0]}</span>
        </h1>
        <p className="greeting-subtitle">System ready. What would you like to process today?</p>
      </div>

      {user.role === 'student' && (
        <>
          <div className="section-label">01 — Performance Readouts</div>

          {/* Stats Summary row */}
          <div className="stats-grid">
            <div className="stat-card top-highlight">
              <div className="stat-header">
                <span className="glow-dot amber"></span>
                <span className="stat-label">Coins Balance</span>
              </div>
              <div className="stat-value">{coins}</div>
              <div className="stat-trend">Reward credits available</div>
            </div>

            <div className="stat-card top-highlight">
              <div className="stat-header">
                <span className="glow-dot electric"></span>
                <span className="stat-label">Quizzes Taken</span>
              </div>
              <div className="stat-value">{user.quizzesTaken || 0}</div>
              <div className="stat-trend">Knowledge extraction sessions</div>
            </div>

            <div className="stat-card top-highlight">
              <div className="stat-header">
                <span className="glow-dot emerald"></span>
                <span className="stat-label">Avg Accuracy</span>
              </div>
              <div className="stat-value">{(user.averageScore || 0).toFixed(0)}%</div>
              <div className="stat-trend">Retained structural data</div>
            </div>
          </div>
        </>
      )}

      <div className="section-label">02 — Operating Modes</div>

      <div className="mode-grid">
        {/* Personal Mode */}
        {user.role === 'student' && (
          <Link href="/personal" style={{ textDecoration: 'none' }}>
            <div 
              className="mode-card personal"
              ref={personalCardRef}
              onMouseMove={(e) => handleMouseMove(e, personalCardRef)}
            >
              <div className="mode-card-content">
                <div className="mode-icon-container">
                  <Video size={20} />
                </div>
                <h3 className="mode-title">Personal Mode</h3>
                <p className="mode-desc">
                  Self-paced asynchronous ingestion. Feed any educational URL to extract the transcript, structural taxonomy, and interactive evaluations.
                </p>
                <div className="mode-cta-row">
                  <span className="mode-cta-pill badge-electric">Self-Paced</span>
                  <span className="mode-cta-text mode-cta-pill">
                    Initialize Extraction <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* College Mode */}
        <Link href={user.role === 'instructor' ? '/college/instructor' : '/college/student'} style={{ textDecoration: 'none' }}>
          <div 
            className="mode-card college"
            ref={collegeCardRef}
            onMouseMove={(e) => handleMouseMove(e, collegeCardRef)}
          >
            <div className="mode-card-content">
              <div className="mode-icon-container">
                <GraduationCap size={20} />
              </div>
              <h3 className="mode-title">College Mode</h3>
              <p className="mode-desc">
                Regimented synchronization array. {user.role === 'instructor' ? 'Broadcast verified knowledge bases to student clusters and monitor extraction efficiency.' : 'Connect to instructor nodes to receive validated knowledge payloads and standardized evaluations.'}
              </p>
              <div className="mode-cta-row">
                <span className="mode-cta-pill badge-amber">Classroom</span>
                <span className="mode-cta-text mode-cta-pill">
                  Establish Uplink <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

