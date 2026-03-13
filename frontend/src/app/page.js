'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '4rem' }}>

      <div className="badge badge-blue" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Sparkles size={14} />
        <span>Powered by Next.js & n8n</span>
      </div>

      <h1 className="page-title" style={{ fontSize: '4rem', maxWidth: '800px', lineHeight: 1.1 }}>
        Transform Any Video Into An <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Interactive Assessment</span>
      </h1>

      <p className="page-description" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '1.5rem 0 3rem' }}>
        EduTrace AI instantly turns YouTube lectures into comprehensive quizzes, summaries, and acts as an AI doubt-resolver with exact timestamp context.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {loading ? (
          <div className="btn btn-secondary" style={{ padding: '1rem 2rem', opacity: 0.7 }}>Loading...</div>
        ) : user ? (
          <Link href="/dashboard" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            Go to Dashboard <ArrowRight size={20} />
          </Link>
        ) : (
          <>
            <Link href="/auth/signup" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Get Started For Free
            </Link>
            <Link href="/auth/login" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              Log In
            </Link>
          </>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid-cards" style={{ marginTop: '6rem', textAlign: 'left', width: '100%' }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>1. Paste URL</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Just drop a YouTube link. We'll extract the full verifiable transcript automatically.</p>
        </div>
        <div className="glass-card">
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--accent-secondary)' }}>2. AI Generation</h3>
          <p style={{ color: 'var(--text-secondary)' }}>n8n orchestrates our AI to parse timestamps, generating highly accurate MCQs & Summaries.</p>
        </div>
        <div className="glass-card">
          <h3 style={{ marginBottom: '0.5rem', color: 'var(--coin-gold)' }}>3. Learn & Earn</h3>
          <p style={{ color: 'var(--text-secondary)' }}>As you answer correctly, you earn coins to redeem exclusive platform badges and themes.</p>
        </div>
      </div>

    </div>
  );
}
