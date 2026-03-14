'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Youtube, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function TestPage() {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [transcribed, setTranscribed] = useState(false);
    const [error, setError] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const [questions, setQuestions] = useState([]);
    const [selectedAnswers, setSelectedAnswers] = useState({});

    const handleTranscribe = async (e) => {
        e.preventDefault();
        if (!youtubeUrl) return;

        if (!/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(youtubeUrl)) {
            setError('Please enter a valid YouTube URL');
            return;
        }

        setTranscribing(true);
        setError('');
        setTranscribed(false);

        try {
            const response = await api.post('/transcription/advanced', { youtubeUrl });
            if (response.data && response.data.audioUrl) {
                setAudioUrl(response.data.audioUrl);
            }
            setTranscribed(true);
        } catch (err) {
            console.error('Transcription error:', err);
            setError('Failed to transcribe video. Please try again.');
        } finally {
            setTranscribing(false);
        }
    };

    const handleGenerateQuiz = async () => {
        setLoading(true);
        setError('');
        setQuestions([]);
        setSelectedAnswers({});

        try {
            const response = await api.post('/test/generate', {
                youtubeUrl,
                audioUrl // Pass the reused audio URL if available
            });

            // Extract questions from the response payload
            // Some n8n webhooks return an array directly, or { questions: [...] }
            let data = response.data;
            let extractedQuestions = [];

            if (Array.isArray(data)) {
                extractedQuestions = data;
            } else if (data && typeof data === 'object') {
                extractedQuestions = data.questions || data.data || data.mcqs || [];
            }

            if (!extractedQuestions || extractedQuestions.length === 0) {
                throw new Error('No questions found in the response.');
            }

            setQuestions(extractedQuestions);
        } catch (err) {
            console.error('Quiz generation error:', err);
            setError('Failed to generate quiz. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleOptionChange = (questionIndex, option) => {
        setSelectedAnswers({
            ...selectedAnswers,
            [questionIndex]: option
        });
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div className="page-header" style={{ textAlign: 'center' }}>
                <h1 className="page-title" style={{
                    background: 'var(--accent-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '1rem'
                }}>
                    Video Quiz Test
                </h1>
                <p className="page-description">Paste any YouTube URL below to instantly generate an MCQ quiz using AI.</p>
            </div>

            <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <form onSubmit={handleTranscribe} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                        <div style={{ position: 'relative' }}>
                            <Youtube
                                size={20}
                                className="hide-mobile"
                                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                            />
                            <input
                                type="url"
                                className="input-field"
                                value={youtubeUrl}
                                onChange={(e) => {
                                    setYoutubeUrl(e.target.value);
                                    setTranscribed(false);
                                    setQuestions([]);
                                }}
                                required
                                placeholder="https://www.youtube.com/watch?v=..."
                                disabled={loading || transcribing}
                                style={{ padding: '1rem', paddingLeft: '3rem', fontSize: '1.1rem' }}
                            />
                        </div>
                    </div>
                    {!transcribed ? (
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ padding: '1rem 2rem', fontSize: '1.1rem', height: '54px' }}
                            disabled={transcribing || !youtubeUrl}
                        >
                            {transcribing ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                                    Transcribing...
                                </>
                            ) : 'Transcribe Video'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleGenerateQuiz}
                            className="btn btn-primary"
                            style={{ padding: '1rem 2rem', fontSize: '1.1rem', height: '54px', background: 'var(--success)' }}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                                    Generating...
                                </>
                            ) : 'Generate Quiz'}
                        </button>
                    )}
                </form>

                {transcribed && !loading && questions.length === 0 && (
                    <div className="badge badge-green" style={{ width: '100%', padding: '0.75rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                        <CheckCircle2 size={18} style={{ marginRight: '0.5rem' }} />
                        Transcription ready! You can now generate the quiz.
                    </div>
                )}

                {error && (
                    <div className="badge badge-red" style={{ width: '100%', padding: '0.75rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                        <AlertCircle size={18} style={{ marginRight: '0.5rem' }} />
                        {error}
                    </div>
                )}
            </div>

            {transcribing && (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--accent-primary)', fontWeight: '600', fontSize: '1.1rem' }}>AI is transcribing video content...</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>This takes about 30-45 seconds. Please wait.</p>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden', marginTop: '1rem' }}>
                        <div style={{ width: '40%', height: '100%', background: 'var(--accent-gradient)', borderRadius: '10px', animation: 'slideRight 2s infinite ease-in-out' }}></div>
                    </div>
                </div>
            )}

            {loading && (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <p style={{ color: 'var(--accent-primary)', fontWeight: '600', fontSize: '1.1rem' }}>AI is generating MCQ quiz...</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>We're extracting the best questions from the transcript. This takes 10-20 seconds.</p>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden', marginTop: '1rem' }}>
                        <div style={{ width: '60%', height: '100%', background: 'var(--accent-gradient)', borderRadius: '10px', animation: 'slideRight 1.5s infinite ease-in-out' }}></div>
                    </div>
                </div>
            )}

            {questions.length > 0 && !loading && (
                <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.6rem', borderRadius: '50%', display: 'flex' }}>
                            <CheckCircle2 size={24} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Assessment Generated</h2>
                    </div>

                    {questions.map((q, qIdx) => (
                        <div key={qIdx} className="glass-card" style={{ padding: '2.5rem 2rem', marginBottom: '2rem', borderLeft: '4px solid var(--accent-primary)' }}>
                            <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '2rem' }}>
                                <div style={{
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    flexShrink: 0,
                                    boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)'
                                }}>
                                    {qIdx + 1}
                                </div>
                                <h3 style={{ fontSize: '1.3rem', lineHeight: '1.5', fontWeight: '600' }}>
                                    {q.question || q.Question || q.text || 'Question'}
                                </h3>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {(q.options || q.Options || [q.option1, q.option2, q.option3, q.option4] || []).filter(Boolean).map((option, oIdx) => (
                                    <label
                                        key={oIdx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1.25rem',
                                            padding: '1.25rem',
                                            borderRadius: 'var(--radius-lg)',
                                            background: selectedAnswers[qIdx] === option ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-tertiary)',
                                            border: selectedAnswers[qIdx] === option ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                            cursor: 'pointer',
                                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: selectedAnswers[qIdx] === option ? 'var(--shadow-md)' : 'none'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${qIdx}`}
                                            className="quiz-radio"
                                            checked={selectedAnswers[qIdx] === option}
                                            onChange={() => handleOptionChange(qIdx, option)}
                                            style={{
                                                width: '22px',
                                                height: '22px',
                                                accentColor: 'var(--accent-primary)',
                                                cursor: 'pointer'
                                            }}
                                        />
                                        <span style={{
                                            fontSize: '1.1rem',
                                            color: selectedAnswers[qIdx] === option ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontWeight: selectedAnswers[qIdx] === option ? '500' : '400'
                                        }}>
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div style={{ textAlign: 'center', marginTop: '4rem', paddingBottom: '2rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                const results = questions.map((q, idx) => ({
                                    question: q.question || q.text,
                                    selected: selectedAnswers[idx]
                                }));
                                console.log('Quiz Results:', results);
                                alert('Quiz submitted! Check the console for your answers.');
                            }}
                            style={{ padding: '1.25rem 4rem', fontSize: '1.2rem', borderRadius: 'var(--radius-lg)' }}
                            disabled={Object.keys(selectedAnswers).length < questions.length}
                        >
                            Complete Quiz
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
