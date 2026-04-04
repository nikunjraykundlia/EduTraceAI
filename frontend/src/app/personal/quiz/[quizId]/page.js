'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const QUIZ_TIME_LIMIT = 300; // 5 minutes standard

const extractStartTime = (timestamp) => {
  if (!timestamp) return '';
  if (typeof timestamp !== 'string') return '';
  if (timestamp.includes('-')) {
    return timestamp.split('-')[0].trim();
  }
  return timestamp;
};

export default function QuizTakingPage() {
  const { quizId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME_LIMIT);
  const timerRef = useRef(null);
  const hasAutoSubmitted = useRef(false);

  const isInstructor = user?.role === 'instructor';

  const doSubmit = useCallback(async (currentAnswers, currentAttemptId) => {
    if (isInstructor) return; // Instructors don't submit
    if (submitting || hasAutoSubmitted.current) return;
    hasAutoSubmitted.current = true;
    setSubmitting(true);
    const mcqAnswers = Object.keys(currentAnswers).map(qId => ({
      questionId: qId,
      selectedAnswer: currentAnswers[qId]
    }));

    try {
      const res = await api.post(`/quiz/${quizId}/submit`, { attemptId: currentAttemptId, mcqAnswers, saqAnswers: [] });
      if (res.data.success) {
        router.push(`/personal/quiz/${quizId}/results?attemptId=${currentAttemptId}`);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to submit protocol');
      setSubmitting(false);
      hasAutoSubmitted.current = false;
    }
  }, [quizId, router, submitting, isInstructor]);

  useEffect(() => {
    const startQuiz = async () => {
      try {
        const res = await api.post(`/quiz/${quizId}/start`);
        if (res.data.success) {
          if (res.data.alreadyCompleted && !isInstructor) {
            router.replace(`/personal/quiz/${quizId}/results?attemptId=${res.data.attemptId}`);
            return;
          }
          if (res.data.attempt) {
            setQuiz(res.data.attempt.quiz);
            setAttemptId(res.data.attempt.attemptId);
          } else if (!res.data.alreadyCompleted) {
             setError('Protocol initialization failed: attempt logic missing.');
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to initialize protocol');
      }
    };
    startQuiz();
  }, [quizId, router, isInstructor]);

  useEffect(() => {
    if (!quiz || !attemptId || isInstructor) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [quiz, attemptId, isInstructor]);

  useEffect(() => {
    if (timeLeft === 0 && attemptId && !hasAutoSubmitted.current && !isInstructor) {
      doSubmit(answers, attemptId);
    }
  }, [timeLeft, attemptId, answers, doSubmit, isInstructor]);

  const currentQ = quiz?.mcqs[currentIdx];

  const handleSelect = (questionId, label) => {
    if (isInstructor) return; // Prevent selection for instructors
    setAnswers({ ...answers, [questionId]: label });
  };

  const handleSubmit = () => {
    if (isInstructor) return;
    clearInterval(timerRef.current);
    doSubmit(answers, attemptId);
  };

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  if (error) return <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--rose)' }}>{error}</div>;
  if (!quiz || !currentQ) return <div style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'var(--font-data)' }}>{quiz && !currentQ ? 'No matrices found.' : 'Compiling Protocol...'}</div>;

  const isLowTime = timeLeft <= 15;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem' }}>
        <div>
          <h1 className="t-h3" style={{ marginBottom: '0.25rem' }}>{quiz.title}</h1>
          <p className="t-small" style={{ color: 'var(--cyan)' }}>
            Node {currentIdx + 1} of {quiz.mcqs.length} 
            {isInstructor && <span style={{ marginLeft: '1rem', color: 'var(--emerald)', fontWeight: 'bold' }}>[TEACHER PREVIEW]</span>}
          </p>
        </div>
        {!isInstructor && (
          <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              fontFamily: 'var(--font-data)', fontSize: '14px', 
              color: isLowTime ? 'var(--rose)' : 'var(--text-primary)',
              background: 'var(--surface-1)', padding: '0.5rem 1rem',
              border: `1px solid ${isLowTime ? 'var(--rose)' : 'var(--stroke-2)'}`,
              position: 'sticky', top: '20px', zIndex: 50
          }}>
            <span className={`glow-dot ${isLowTime ? 'rose' : 'cyan'}`}></span>
            {formatTimer(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress bar (hide for instructors) */}
      {!isInstructor && (
        <div style={{ width: '100%', height: '2px', background: 'var(--surface-3)', marginBottom: '2.5rem', overflow: 'hidden' }}>
          <div style={{ 
            width: `${(timeLeft / QUIZ_TIME_LIMIT) * 100}%`, 
            height: '100%', 
            background: isLowTime ? 'var(--rose)' : 'var(--emerald)', 
            transition: 'width 1s linear'
          }} />
        </div>
      )}

      {/* Question Card */}
      <div style={{ background: 'var(--surface-0)', padding: '2rem 1.5rem', marginBottom: '2.5rem', border: `2px solid ${isInstructor ? 'var(--emerald)' : 'var(--cyan)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
           <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '600', fontSize: '24px', lineHeight: 1.4, color: 'var(--text-primary)' }}>
             {currentQ.question}
           </h2>
           {currentQ.exacttimestamp && (
             <div className="badge badge-cyan" style={{ whiteSpace: 'nowrap', marginLeft: '1rem' }}>
               Timestamp // {extractStartTime(currentQ.exacttimestamp)}
             </div>
           )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {currentQ.options.map((opt) => {
            const isSelected = answers[currentQ._id] === opt.label;
            const isCorrect = isInstructor && opt.label === currentQ.correctAnswer;
            
            return (
              <div 
                key={opt.label}
                onClick={() => handleSelect(currentQ._id, opt.label)}
                style={{
                  padding: '1.25rem 1.5rem',
                  border: isCorrect ? '2px solid var(--emerald)' : (isSelected ? '1px solid var(--cyan)' : '1px solid var(--stroke-1)'),
                  background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : (isSelected ? 'rgba(0, 200, 220, 0.1)' : 'var(--surface-1)'),
                  cursor: isInstructor ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  transition: 'all 0.2s',
                  color: isCorrect ? 'var(--emerald)' : (isSelected ? 'var(--cyan)' : 'var(--text-primary)')
                }}
              >
                <div style={{ 
                  width: '24px', height: '24px', 
                  background: isCorrect ? 'var(--emerald)' : (isSelected ? 'var(--cyan)' : 'var(--surface-2)'), 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontFamily: 'var(--font-data)', fontSize: '11px', fontWeight: 'bold',
                  color: (isCorrect || isSelected) ? '#000' : 'var(--text-muted)'
                }}>
                  {opt.label}
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', lineHeight: '1.5' }}>{opt.text}</span>
                  {isCorrect && <span style={{ fontSize: '10px', color: 'var(--emerald)', fontWeight: 'bold', letterSpacing: '0.05em' }}>CORRECT KEY</span>}
                </div>
              </div>
            );
          })}
        </div>
        
        {isInstructor && currentQ.explanation && (
          <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '4px solid var(--emerald)', borderRadius: '4px' }}>
            <p style={{ fontSize: '12px', color: 'var(--emerald)', fontWeight: 'bold', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>EXPLANATION</p>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>{currentQ.explanation}</p>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
        >
          Previous Node
        </button>
        
        {currentIdx === quiz.mcqs.length - 1 ? (
          <button 
            className={`btn ${isInstructor ? 'btn-secondary' : 'btn-primary'}`} 
            onClick={isInstructor ? () => router.back() : handleSubmit} 
            disabled={submitting}
          >
            {isInstructor ? 'Exit Preview' : (submitting ? 'Committing...' : 'Commit Evaluation')}
          </button>
        ) : (
          <button 
            className="btn btn-primary" 
            onClick={() => setCurrentIdx(prev => Math.min(quiz.mcqs.length - 1, prev + 1))}
          >
            Advance Node
          </button>
        )}
      </div>
      
    </div>
  );
}
