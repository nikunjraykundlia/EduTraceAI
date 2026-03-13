'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, Sparkles, BookOpen, Layers } from 'lucide-react';
import ChatInterface from '@/components/chat/ChatInterface';
import api from '@/lib/api';

export default function DoubtSolverPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [classrooms, setClassrooms] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'student')) {
            router.push('/dashboard');
        }

        if (user && user.role === 'student') {
            fetchStudentClasses();
        }
    }, [user, loading, router]);

    const fetchStudentClasses = async () => {
        try {
            const response = await api.get('/classroom/student/my-classes');
            if (response.data.success) {
                setClassrooms(response.data.classrooms);
            }
        } catch (error) {
            console.error('Error fetching classes for doubt solver:', error);
        }
    };

    if (loading || !user) return <div style={{ textAlign: 'center', marginTop: '4rem' }}>Loading Doubt Solver...</div>;

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: '3rem' }}>
                <h1 className="page-title">AI Doubt Solver</h1>
                <p className="page-description">Instant answers and explanations from your course lectures.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: '2rem' }}>

                {/* Sidebar: Lecture Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <Layers size={20} color="var(--accent-primary)" />
                            <h2 style={{ fontSize: '1.1rem' }}>Select Lecture</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {classrooms.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>You haven't joined any classes yet.</p>
                            ) : (
                                classrooms.map((cls) => (
                                    <div key={cls._id}>
                                        <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
                                            {cls.name}
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {cls.videos?.map((vid) => (
                                                <button
                                                    key={vid._id}
                                                    onClick={() => setSelectedVideo(vid)}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '0.75rem',
                                                        background: selectedVideo?._id === vid._id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                                        border: `1px solid ${selectedVideo?._id === vid._id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                                        borderRadius: 'var(--radius-md)',
                                                        color: selectedVideo?._id === vid._id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                        fontWeight: selectedVideo?._id === vid._id ? '600' : 'normal',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {vid.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Pro Tips</h3>
                        <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <li>Ask about specific timestamps.</li>
                            <li>"Explain this concept simply" works wonders.</li>
                            <li>Request summaries of key sections.</li>
                        </ul>
                    </div>
                </div>

                {/* Chat Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '600px' }}>
                    {selectedVideo ? (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <MessageSquare size={18} color="var(--accent-primary)" />
                                    <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>Chatting about: <span style={{ color: 'var(--accent-primary)' }}>{selectedVideo.title}</span></span>
                                </div>
                            </div>
                            <ChatInterface videoId={selectedVideo._id} />
                        </div>
                    ) : (
                        <div className="glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
                            <Sparkles size={48} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                            <h3 style={{ marginBottom: '0.5rem' }}>Ready to solve your doubts?</h3>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
                                Select a video lecture from the sidebar to start a conversation with your AI Study Mentor.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
