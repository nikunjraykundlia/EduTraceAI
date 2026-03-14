'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Trophy, ArrowLeft, Coins, Download, FileText } from 'lucide-react';
import api from '@/lib/api';

export default function QuizResultsPage() {
  const { quizId } = useParams();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attemptId) {
      setError('No attempt ID provided');
      return;
    }

    const fetchResults = async () => {
      try {
        const res = await api.get(`/quiz/${quizId}/results/${attemptId}`);
        if(res.data.success) {
           setResults(res.data.results);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load results');
      }
    };
    fetchResults();
  }, [quizId, attemptId]);

  const handleDownload = async () => {
    try {
      const res = await api.get(`/quiz/${quizId}/download/${attemptId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Assessment_Report_${quizId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download report. Please try again.');
    }
  };

  if (error) return <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--danger)' }}>{error}</div>;

  if (!results) return <div style={{ textAlign: 'center', marginTop: '4rem' }}>Loading Results...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <button onClick={handleDownload} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
          <Download size={16} /> Download Report (PDF)
        </button>
      </div>

      {/* Big Score Card */}
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
        {results.totalScore >= 50 && (
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', opacity: 0.1, color: 'var(--success)' }}>
            <Trophy size={300} />
          </div>
        )}
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Assessment Complete</h1>
        <div style={{ fontSize: '5rem', fontWeight: '800', lineHeight: 1, fontFamily: 'var(--font-display)', marginBottom: '1.5rem', 
                      color: results.totalScore >= 50 ? 'var(--success)' : 'var(--danger)' }}>
          {results.totalScore}%
        </div>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', background: 'var(--bg-tertiary)', padding: '1rem 2rem', borderRadius: 'var(--radius-full)' }}>
          <div>
             <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold' }}>{results.correctAnswers}</span>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Correct</span>
          </div>
          <div style={{ width: '1px', background: 'var(--border-color)', height: '30px' }}></div>
          <div>
             <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold' }}>{results.incorrectAnswers}</span>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Incorrect</span>
          </div>
          <div style={{ width: '1px', background: 'var(--border-color)', height: '30px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--coin-gold)' }}>
             <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
               <Coins size={20} /> +{results.coinsEarned}
             </span>
             <span style={{ fontSize: '0.8rem' }}>Coins Earned</span>
          </div>
        </div>
      </div>

      {/* Detailed Review */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>Detailed Review</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {results.detailedResults.map((item, idx) => (
          <div key={idx} className="glass-card" style={{ borderLeft: `4px solid ${item.isCorrect ? 'var(--success)' : 'var(--danger)'}`, position: 'relative' }}>
            {item.topic && (
              <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.topic}
                </span>
              </div>
            )}
            
            <div style={{ paddingRight: '6rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', lineHeight: 1.4, fontWeight: '600' }}>
                <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>Q{idx + 1}.</span>
                {item.question}
              </h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Your Answer</p>
                <p style={{ fontWeight: '600', fontSize: '1.05rem', color: item.isCorrect ? 'var(--success)' : 'var(--danger)' }}>Option {item.selectedAnswer}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Correct Answer</p>
                <p style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--success)' }}>Option {item.correctAnswer}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={14} /> Explanation
                </p>
                <div style={{ fontSize: '0.95rem', lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  {item.explanation}
                </div>
              </div>

              {item.sourceTimestamp?.transcriptExcerpt && (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '700' }}>
                    📎 Citation from Video
                  </p>
                  <div style={{ fontSize: '0.9rem', lineHeight: 1.6, fontStyle: 'italic', background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--text-secondary)' }}>
                    "{item.sourceTimestamp.transcriptExcerpt}"
                  </div>
                </div>
              )}
            </div>
            
            {item.sourceTimestamp && (
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                 <span 
                   className="badge badge-blue" 
                   style={{ cursor: 'pointer', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                   onClick={() => {
                     const videoElement = document.querySelector('video');
                     if (videoElement) {
                       videoElement.currentTime = item.sourceTimestamp.startTime;
                       videoElement.play();
                     } else {
                       // Logic for external link if video not on page
                       window.open(`${window.location.origin}/personal/video/${results.videoId}?t=${item.sourceTimestamp.startTime}`, '_blank');
                     }
                   }}
                 >
                   Watch Concept in Video ({Math.floor(item.sourceTimestamp.startTime / 60)}:{(item.sourceTimestamp.startTime % 60).toString().padStart(2, '0')})
                 </span>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
