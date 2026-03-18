'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, User, Bot, AlertCircle, Quote, Clock, Sparkles } from 'lucide-react';
import api from '@/lib/api';

export default function ChatInterface({ videoId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [sessionId, setSessionId] = useState(null);
    const messagesEndRef = useRef(null);

    const convertTimestampToSeconds = (timestamp) => {
        const parts = timestamp.split(':');
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    };

    const extractFirstTimestamp = (timestampRange) => {
        if (!timestampRange) return '';
        // Handle multiple timestamp ranges separated by comma
        const firstRange = timestampRange.split(',')[0].trim();
        // Extract only the start time (before the dash)
        return firstRange.split('-')[0].trim();
    };

    const extractAllTimestamps = (timestampRange) => {
        if (!timestampRange) return [];
        // Split by comma to get multiple ranges
        const ranges = timestampRange.split(',').map(range => range.trim());
        // Extract start times from each range
        return ranges.map(range => {
            const startTime = range.split('-')[0].trim();
            return {
                display: startTime,
                seconds: convertTimestampToSeconds(startTime)
            };
        });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (videoId) {
            // Clear localStorage on page load to ensure chats are temporary
            localStorage.removeItem(`chat_${videoId}`);
            setMessages([]);
            setSessionId(null);
            setHistoryLoading(false);
        }
    }, [videoId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchChatHistory = async () => {
        // No longer fetching from MongoDB, using localStorage only
        setHistoryLoading(false);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading || !videoId) return;

        const userQuestion = input.trim();
        setInput('');
        setLoading(true);

        // Optimistically add user message
        const tempUserMsg = { role: 'user', content: userQuestion, timestamp: new Date() };
        setMessages((prev) => [...prev, tempUserMsg]);

        try {
            const response = await api.post(`/chat/${videoId}`, {
                question: userQuestion,
                sessionId: null // No session ID needed for localStorage
            });

            if (response.data.success) {
                console.log('Chat response data:', JSON.stringify(response.data, null, 2));
                const assistantMsg = {
                    role: 'assistant',
                    ...response.data.response,
                    timestamp: new Date()
                };
                console.log('Assistant message:', JSON.stringify(assistantMsg, null, 2));
                setMessages((prev) => [...prev, assistantMsg]);
                
                // Store messages in localStorage
                const updatedMessages = [...messages, tempUserMsg, assistantMsg];
                localStorage.setItem(`chat_${videoId}`, JSON.stringify(updatedMessages));
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = {
                role: 'assistant',
                shortAnswer: 'Error',
                mainAnswer: 'I encountered an error while processing your request. Please try again.',
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, errorMsg]);
            
            // Store error message in localStorage as well
            const updatedMessages = [...messages, tempUserMsg, errorMsg];
            localStorage.setItem(`chat_${videoId}`, JSON.stringify(updatedMessages));
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceColor = (level) => {
        switch (level) {
            case 'high': return 'var(--success)';
            case 'medium': return 'var(--warning)';
            case 'low': return 'var(--danger)';
            default: return 'var(--accent-primary)';
        }
    };

    if (!videoId) {
        return (
            <div className="glass-panel" style={{ height: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)' }}>
                <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Select a lecture to start chatting with your AI Study Copilot.</p>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 style={{ fontSize: '1rem' }}>AI Study Copilot</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Online & Ready</p>
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {historyLoading ? (
                    <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem' }}>Loading conversation history...</div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No messages yet. Ask anything about the lesson!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}>
                            <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '85%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    background: msg.role === 'user' ? 'var(--bg-tertiary)' : 'var(--accent-gradient)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>

                                <div style={{
                                    padding: msg.role === 'user' ? '0.75rem 1rem' : '1.25rem',
                                    borderRadius: 'var(--radius-lg)',
                                    background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                    color: 'white',
                                    border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                                    boxShadow: msg.role === 'assistant' && msg.confidenceLevel ? `0 0 15px ${getConfidenceColor(msg.confidenceLevel)}20` : 'none'
                                }}>
                                    {msg.role === 'user' ? (
                                        <p style={{ fontSize: '0.95rem' }}>{msg.content}</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {msg.shortAnswer && (
                                                <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--accent-primary)', borderLeft: '2px solid var(--accent-primary)', paddingLeft: '0.75rem' }}>
                                                    {msg.shortAnswer}
                                                </div>
                                            )}

                                            <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                                                {msg.mainAnswer}
                                            </div>

                                            {msg.evidence && msg.evidence.length > 0 && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                    <p style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Quote size={12} /> Evidence from Transcript
                                                    </p>
                                                    
                                                    {/* Display video title at the top of evidence section */}
                                                    {msg.youtubeVideoTitle && (
                                                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--accent-primary)' }}>
                                                                <strong>Video:</strong> {msg.youtubeVideoTitle}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {msg.evidence.map((ev, eIdx) => (
                                                        <div key={eIdx} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                                            <p style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>"{ev.transcriptExcerpt}"</p>
                                                        </div>
                                                    ))}
                                                    
                                                    {/* Display all timestamps from timestampRange */}
                                                    {msg.timestampRange && (
                                                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                                            <p style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                                <Clock size={12} /> Relevant Timestamps
                                                            </p>
                                                            {extractAllTimestamps(msg.timestampRange).map((ts, tsIdx) => (
                                                                <div key={tsIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                                                                    <a
                                                                        href={`https://www.youtube.com/watch?v=${videoId}&t=${ts.seconds}s`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: 'var(--accent-primary)', textDecoration: 'underline', fontSize: '0.75rem' }}
                                                                        onClick={() => console.log('Clicked timestamp:', { videoId, timestamp: ts.display, seconds: ts.seconds, url: `https://www.youtube.com/watch?v=${videoId}&t=${ts.seconds}s` })}
                                                                    >
                                                                        {ts.display}
                                                                    </a>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            
                                            {msg.confidenceLevel && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getConfidenceColor(msg.confidenceLevel) }}></div>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}> Confidence: {msg.confidenceLevel}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', marginLeft: msg.role === 'user' ? '0' : '40px', marginRight: msg.role === 'user' ? '40px' : '0' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', zIndex: 10 }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Type your question here..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading || !videoId}
                            style={{ paddingRight: '1rem', width: '100%', height: '48px' }}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !input.trim() || !videoId}
                        style={{
                            height: '48px',
                            padding: '0 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            minWidth: '100px'
                        }}
                    >
                        {loading ? (
                            <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                        ) : (
                            <>
                                <span>Send</span>
                                <Send size={16} />
                            </>
                        )}
                    </button>
                </form>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={12} /> Powered by AI transcript analysis.
                    </p>
                </div>
            </div>

            <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
