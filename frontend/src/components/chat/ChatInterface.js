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
    const [youtubeVideoId, setYoutubeVideoId] = useState(null);
    const messagesEndRef = useRef(null);

    const convertTimestampToSeconds = (timestamp) => {
        if (!timestamp || typeof timestamp !== 'string') return 0;
        
        const parts = timestamp.split(':');
        if (parts.length === 3) {
            // HH:MM:SS format
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            const seconds = parseInt(parts[2]) || 0;
            return hours * 3600 + minutes * 60 + seconds;
        } else if (parts.length === 2) {
            // MM:SS format (from n8n)
            const minutes = parseInt(parts[0]) || 0;
            const seconds = parseInt(parts[1]) || 0;
            return minutes * 60 + seconds;
        } else {
            // Invalid format
            return 0;
        }
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
            const seconds = convertTimestampToSeconds(startTime);
            
            return {
                display: startTime,
                seconds: seconds
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
            
            // Fetch video data to get YouTube video ID
            const fetchVideoData = async () => {
                try {
                    const response = await api.get(`/personal/video/${videoId}`);
                    if (response.data.success && response.data.video) {
                        setYoutubeVideoId(response.data.video.youtubeVideoId);
                    }
                } catch (error) {
                    console.error('Failed to fetch video data:', error);
                }
            };
            fetchVideoData();
        }
    }, [videoId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchChatHistory = async () => {
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
                sessionId: null 
            });

            if (response.data.success) {
                const assistantMsg = {
                    role: 'assistant',
                    ...response.data.response,
                    timestamp: new Date()
                };
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
            
            const updatedMessages = [...messages, tempUserMsg, errorMsg];
            localStorage.setItem(`chat_${videoId}`, JSON.stringify(updatedMessages));
        } finally {
            setLoading(false);
        }
    };

    const getConfidenceColor = (level) => {
        switch (level) {
            case 'high': return 'var(--emerald)';
            case 'medium': return 'var(--yellow)';
            case 'low': return 'var(--rose)';
            default: return 'var(--cyan)';
        }
    };

    if (!videoId) {
        return (
            <div className="glass-panel" style={{ height: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--stroke-2)' }}>
                <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'var(--text-secondary)' }} />
                <p className="t-small" style={{ color: 'var(--text-secondary)' }}>Select a node to initialize dialogue interface.</p>
            </div>
        );
    }

    return (
        <div style={{ background: 'var(--surface-0)', borderLeft: '1px solid var(--stroke-1)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--stroke-1)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface-1)' }}>
                <div style={{ color: 'var(--cyan)' }}>
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="t-h4" style={{ marginBottom: '0.25rem' }}>AI INTELLIGENCE HUB</h3>
                    <p style={{ fontFamily: 'var(--font-data)', fontSize: '11px', color: 'var(--emerald)', textTransform: 'uppercase' }}>● Connection Active</p>
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {historyLoading ? (
                    <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '2rem', fontFamily: 'var(--font-data)' }}>Establishing link...</div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-data)', fontSize: '12px' }}>Vocalize query to commence evaluation.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}>
                            <div style={{ display: 'flex', gap: '1rem', maxWidth: '85%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    flexShrink: 0,
                                    border: msg.role === 'user' ? '1px solid var(--cyan)' : '1px solid var(--stroke-2)',
                                    background: msg.role === 'user' ? 'rgba(0, 200, 220, 0.1)' : 'var(--surface-2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: msg.role === 'user' ? 'var(--cyan)' : 'var(--text-secondary)'
                                }}>
                                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>

                                <div style={{
                                    padding: '1.25rem',
                                    background: msg.role === 'user' ? 'rgba(0, 200, 220, 0.1)' : 'var(--surface-1)',
                                    color: 'var(--text-primary)',
                                    border: msg.role === 'user' ? '1px solid var(--cyan)' : '1px solid transparent',
                                    borderLeft: msg.role === 'assistant' ? '2px solid var(--text-secondary)' : undefined,
                                    position: 'relative'
                                }}>
                                    {msg.role === 'user' ? (
                                        <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{msg.content}</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                            {msg.confidenceLevel && (
                                                <div style={{ 
                                                    position: 'absolute', 
                                                    top: '1rem', 
                                                    right: '1rem',
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.5rem',
                                                    background: 'var(--surface-2)',
                                                    padding: '0.25rem 0.5rem',
                                                }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getConfidenceColor(msg.confidenceLevel) }}></div>
                                                    <span style={{ fontFamily: 'var(--font-data)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{msg.confidenceLevel.toUpperCase()}</span>
                                                </div>
                                            )}
                                            {msg.shortAnswer && (
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--cyan)', borderLeft: '2px solid var(--cyan)', paddingLeft: '0.75rem' }}>
                                                    {msg.shortAnswer}
                                                </div>
                                            )}

                                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                                {msg.mainAnswer}
                                            </div>

                                            {msg.evidence && msg.evidence.length > 0 && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    <p style={{ fontFamily: 'var(--font-data)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Quote size={12} /> Matrix Citation
                                                    </p>
                                                    
                                                    {msg.youtubeVideoTitle && (
                                                        <div style={{ background: 'var(--surface-2)', padding: '0.75rem 1rem', border: '1px solid var(--stroke-1)', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontSize: '12px', color: 'var(--cyan)' }}>
                                                                <strong style={{ color: 'var(--text-primary)' }}>Source:</strong> {msg.youtubeVideoTitle}
                                                            </span>
                                                        </div>
                                                    )}
                                                    
                                                    {msg.timestampRange && (
                                                        <div style={{ background: 'var(--surface-2)', padding: '1rem', border: '1px solid var(--stroke-1)' }}>
                                                            <p style={{ fontFamily: 'var(--font-data)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                                <Clock size={12} /> Sync Vectors
                                                            </p>
                                                            {extractAllTimestamps(msg.timestampRange).map((ts, tsIdx) => (
                                                                <div key={tsIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                                    <a
                                                                        href={`https://www.youtube.com/watch?v=${youtubeVideoId}&t=${ts.seconds}s`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: 'var(--cyan)', textDecoration: 'none', fontFamily: 'var(--font-data)', fontSize: '11px' }}
                                                                    >
                                                                        [{ts.display}] OPEN NODE
                                                                    </a>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    {msg.evidence.map((ev, eIdx) => (
                                                        <div key={eIdx} style={{ background: 'var(--surface-2)', padding: '1rem', border: '1px solid var(--stroke-1)', fontFamily: 'var(--font-data)' }}>
                                                            <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>"{ev.transcriptExcerpt}"</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span style={{ fontFamily: 'var(--font-data)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '0.5rem', marginLeft: msg.role === 'user' ? '0' : '50px', marginRight: msg.role === 'user' ? '50px' : '0' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--stroke-1)', background: 'var(--surface-0)', zIndex: 10 }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Initialize query syntax..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading || !videoId}
                            style={{ padding: '0 1rem', width: '100%', height: '48px', fontFamily: 'var(--font-data)', fontSize: '12px' }}
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
                            minWidth: '120px'
                        }}
                    >
                        {loading ? (
                            <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                        ) : (
                            <>
                                <span style={{ fontFamily: 'var(--font-data)', fontSize: '12px', textTransform: 'uppercase' }}>Transmit</span>
                                <Send size={14} />
                            </>
                        )}
                    </button>
                </form>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                    <p style={{ fontFamily: 'var(--font-data)', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase' }}>
                        <AlertCircle size={10} /> NLP Processing Active
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
