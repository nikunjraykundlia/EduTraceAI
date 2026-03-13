'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Video } from 'lucide-react';

export default function PersonalModeHome() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transcriptData, setTranscriptData] = useState(null);
  const router = useRouter();

  const isYoutubeUrl = (testUrl) => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(testUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isYoutubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }
    setError('');
    setLoading(true);
    setTranscriptData(null);

    try {
      // Trigger the advanced transcription pipeline (yt-dlp -> ImageKit -> n8n)
      const res = await api.post('/transcription/advanced', { youtubeUrl: url });

      if (res.data.success) {
        setTranscriptData(res.data.transcript);
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'High-fidelity transcription failed. Please check the URL or try again later.');
      setLoading(false);
    }
  };

  const handleProceed = async () => {
    setLoading(true);
    try {
      // Create the video entry using the successfully generated transcript
      const res = await api.post('/personal/video', {
        youtubeUrl: url,
        transcript: transcriptData
      });

      if (res.data.success) {
        router.push(`/personal/video/${res.data.video._id}`);
      }
    } catch (err) {
      setError('Failed to save video to your library.');
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', padding: '1rem', borderRadius: 'var(--radius-full)' }}>
            <Video size={48} />
          </div>
        </div>
        <h1 className="page-title">Personal Mode</h1>
        <p className="page-description">Paste any educational YouTube URL below to extract a high-fidelity transcript using our AI pipeline.</p>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        {error && <div className="badge badge-red" style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>{error}</div>}

        {!transcriptData ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <input
                type="url"
                className="input-field"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={loading}
                style={{ padding: '1rem', fontSize: '1.1rem', borderColor: url && !isYoutubeUrl(url) ? 'var(--danger)' : '' }}
              />
              {url && !isYoutubeUrl(url) && (
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Please enter a valid YouTube URL.</p>
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} disabled={loading || !url || !isYoutubeUrl(url)}>
              {loading ? 'Processing...' : 'Start Extraction'}
            </button>
          </form>
        ) : (
          <div className="animate-fade-in">
            <div className="badge badge-green" style={{ marginBottom: '1rem' }}>✅ Transcription Complete</div>
            <h3 style={{ marginBottom: '1rem' }}>Transcript Preview</h3>
            <div style={{
              background: 'var(--bg-tertiary)',
              padding: '1.5rem',
              borderRadius: 'var(--radius-md)',
              maxHeight: '300px',
              overflowY: 'auto',
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              marginBottom: '2rem'
            }}>
              {typeof transcriptData === 'string' ? transcriptData : (transcriptData.raw || JSON.stringify(transcriptData, null, 2))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setTranscriptData(null)} className="btn btn-secondary">
                Try Another URL
              </button>
              <button onClick={handleProceed} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }} disabled={loading}>
                {loading ? 'Saving...' : 'Proceed to Quiz & Summary'}
              </button>
            </div>
          </div>
        )}

        {loading && !transcriptData && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>Deep-Extracting Audio & Context</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>This powerful AI process can take 30-60 seconds for precision.</p>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
              <div style={{ width: '50%', height: '100%', background: 'var(--accent-gradient)', animation: 'slideRight 2s infinite ease-in-out' }}></div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideRight { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      `}</style>
    </div>
  );
}
