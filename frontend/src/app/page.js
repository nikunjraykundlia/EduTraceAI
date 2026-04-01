'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRef } from 'react';
import {
  ArrowRight, Zap, BarChart3, Trophy,
  GraduationCap, Video, Brain, CheckCircle2, Sparkles,
} from 'lucide-react';
import LiquidEther from '@/components/ui/LiquidEther';
import './home.css';

export default function HomePage() {
  const { user, loading } = useAuth();
  const heroRef = useRef(null);

  if (loading) return null;

  const features = [
    {
      icon: <Video size={22} />,
      color: 'electric',
      title: 'Video Intelligence',
      desc: 'Paste any YouTube URL and our AI extracts the full transcript, builds a structural taxonomy, and prepares an evaluation payload in seconds.',
    },
    {
      icon: <Brain size={22} />,
      color: 'violet',
      title: 'AI-Generated Quizzes',
      desc: 'Gemini-powered question generation creates MCQs calibrated to the video\'s depth — from foundational recall to applied comprehension.',
    },
    {
      icon: <Trophy size={22} />,
      color: 'amber',
      title: 'Gamified Learning',
      desc: 'Earn coins for every quiz you ace. Spend them in the store to unlock hints, power-ups and advanced content packs.',
    },
    {
      icon: <GraduationCap size={22} />,
      color: 'emerald',
      title: 'College Mode',
      desc: 'Instructors broadcast video-linked assessments to entire student cohorts. Real-time performance analytics included.',
    },
    {
      icon: <BarChart3 size={22} />,
      color: 'cyan',
      title: 'Deep Analytics',
      desc: 'Track accuracy trends, identify weak concepts, and surface re-watch timestamps for targeted remediation.',
    },
    {
      icon: <Sparkles size={22} />,
      color: 'rose',
      title: 'Interview Assessment',
      desc: 'AI-driven mock interview sessions with feedback powered by n8n workflows and large language model evaluation.',
    },
  ];

  const steps = [
    { num: '01', title: 'Paste a URL', desc: 'Drop any educational YouTube link into the ingestion panel.' },
    { num: '02', title: 'AI Extracts', desc: 'Transcript, taxonomy, and quiz questions generated in ~30s.' },
    { num: '03', title: 'Take the Quiz', desc: 'Time-limited MCQ session calibrated to the content depth.' },
    { num: '04', title: 'Earn & Grow', desc: 'Coins, streaks and analytics track your mastery over time.' },
  ];

  return (
    <div className="home-page">
      {/* ── Ambient Grid (non-hero sections) ───────────────────────────────── */}
      <div className="home-ambient">
        <div className="ambient-grid"></div>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="hero-section" ref={heroRef}>

        {/* LiquidEther fluid background */}
        <div className="hero-liquid-bg" aria-hidden="true">
          <LiquidEther
            colors={['#5227FF', '#7c3aff', '#FF9FFC', '#B19EEF', '#00d4ff']}
            mouseForce={20}
            cursorSize={100}
            isViscous
            viscous={30}
            iterationsViscous={32}
            iterationsPoisson={32}
            resolution={0.5}
            isBounce={false}
            autoDemo
            autoSpeed={0.5}
            autoIntensity={2.2}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
          />
          {/* Dark overlay so text remains legible */}
          <div className="hero-liquid-overlay" />
        </div>

        <div className="hero-badge">
          <span className="glow-dot electric"></span>
          <span className="t-label" style={{ color: 'var(--electric)' }}>Powered by Mistral + n8n Workflows</span>
        </div>

        <h1 className="hero-title">
          Turn Any Lecture Into<br />
          <span className="hero-title-gradient">Interactive Intelligence</span>
        </h1>

        <p className="hero-subtitle">
          EduTrace AI converts YouTube educational videos into structured summaries and
          AI quizzes instantly.
        </p>

        <div className="hero-actions">
          {user ? (
            <Link href="/dashboard" className="btn btn-primary hero-cta-primary">
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link href="/auth/signup" className="btn btn-primary hero-cta-primary">
                Start Learning Free <ArrowRight size={16} />
              </Link>
              <Link href="/auth/login" className="btn btn-secondary hero-cta-secondary">
                Log In
              </Link>
            </>
          )}
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-value">30s</span>
            <span className="hero-stat-label">Quiz generation</span>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <span className="hero-stat-value">100%</span>
            <span className="hero-stat-label">AI-powered</span>
          </div>
          <div className="hero-stat-divider"></div>
          <div className="hero-stat">
            <span className="hero-stat-value">∞</span>
            <span className="hero-stat-label">Video sources</span>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section className="section how-it-works">
        <div className="section-inner">
          <div className="section-label">How It Works</div>
          <h2 className="section-title">Four Steps to Mastery</h2>
          <div className="steps-grid">
            {steps.map((s) => (
              <div className="step-card" key={s.num}>
                <div className="step-num t-label">{s.num}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="section features-section">
        <div className="section-inner">
          <div className="section-label">Platform Capabilities</div>
          <h2 className="section-title">Everything You Need to Learn Smarter</h2>
          <div className="features-grid">
            {features.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className={`feature-icon feature-icon-${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Highlights ─────────────────────────────────────────────────────── */}
      <section className="section highlights-section">
        <div className="section-inner highlights-inner">
          <div className="highlights-text">
            <div className="section-label">Why EduTrace</div>
            <h2 className="section-title">Built for Serious<br />Learners</h2>
            <ul className="highlights-list">
              {[
                'Zero setup — works from any YouTube URL',
                'Instructor dashboard with real-time cohort analytics',
                'Gamified coin economy keeps motivation high',
                'Interview prep with AI feedback loops',
                'Personal + College operating modes',
                'Spectral dark UI crafted for long study sessions',
              ].map((item) => (
                <li key={item} className="highlight-item">
                  <CheckCircle2 size={16} style={{ color: 'var(--emerald)', flexShrink: 0 }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="highlights-visual">
            <div className="visual-card">
              <div className="visual-card-header">
                <span className="glow-dot emerald"></span>
                <span className="t-label" style={{ color: 'var(--text-muted)' }}>Session Active</span>
              </div>
              <div className="visual-metric">
                <span className="visual-metric-label t-label">Accuracy</span>
                <span className="visual-metric-value" style={{ color: 'var(--emerald)' }}>94%</span>
              </div>
              <div className="visual-bar-track">
                <div className="visual-bar-fill" style={{ width: '94%', background: 'var(--emerald)' }}></div>
              </div>
              <div className="visual-metric" style={{ marginTop: '1.25rem' }}>
                <span className="visual-metric-label t-label">Coins Earned</span>
                <span className="visual-metric-value" style={{ color: 'var(--amber)' }}>+240 ₿</span>
              </div>
              <div className="visual-bar-track">
                <div className="visual-bar-fill" style={{ width: '68%', background: 'var(--amber)' }}></div>
              </div>
              <div className="visual-metric" style={{ marginTop: '1.25rem' }}>
                <span className="visual-metric-label t-label">Questions</span>
                <span className="visual-metric-value" style={{ color: 'var(--electric)' }}>10/10</span>
              </div>
              <div className="visual-bar-track">
                <div className="visual-bar-fill" style={{ width: '100%', background: 'var(--electric)' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="section cta-section">
        <div className="cta-card">
          <div className="cta-glow"></div>
          <Zap size={32} style={{ color: 'var(--amber)', marginBottom: '1rem' }} />
          <h2 className="cta-title">Ready to Supercharge Your Learning?</h2>
          <p className="cta-sub">Join students and instructors already using EduTrace AI.</p>
          <Link href="/dashboard" className="btn btn-primary" style={{ fontSize: '15px', padding: '0.875rem 2rem' }}>
            Get Started — It&apos;s Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="home-footer">
        <span className="brand-name" style={{ fontSize: '14px' }}>EduTrace AI</span>
        <span className="t-small">© 2025 · Built with Gemini AI &amp; n8n · All rights reserved.</span>
      </footer>
    </div>
  );
}
