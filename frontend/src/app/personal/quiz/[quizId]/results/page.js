'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Trophy, ArrowLeft, Coins, Download, FileText } from 'lucide-react';
import api from '@/lib/api';
import { useCoins } from '@/context/CoinsContext';
import html2canvas from 'html2canvas';

export default function QuizResultsPage() {
  const { quizId } = useParams();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const { fetchCoins } = useCoins();
  const downloadButtonRef = useRef(null);

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
           // Update coins in Navbar
           fetchCoins();
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load results');
      }
    };
    fetchResults();
  }, [quizId, attemptId, fetchCoins]);

  const extractStartTime = (timestamp) => {
    if (!timestamp) return '';
    
    // Handle range format "MM:SS-MM:SS" or "H:MM:SS-H:MM:SS"
    if (timestamp.includes('-')) {
      return timestamp.split('-')[0].trim();
    }
    
    // Handle single timestamp format
    return timestamp;
  };

  const handleDownload = async () => {
    try {
      // Show loading state
      if (downloadButtonRef.current) {
        downloadButtonRef.current.disabled = true;
        downloadButtonRef.current.innerHTML = '<span style="display: flex; align-items: center; gap: 0.5rem;"><span style="width: 16px; height: 16px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></span> Generating PDF...</span>';
      }

      // Find the main container
      const element = document.querySelector('.animate-fade-in');
      if (!element) {
        throw new Error('Results container not found');
      }

      // Find the "Assessment Complete" card (first glass-card)
      const scoreCard = element.querySelector('.glass-card');
      if (!scoreCard) {
        throw new Error('Assessment Complete card not found');
      }

      // Find all question cards
      const questionCards = document.querySelectorAll('.question-card');
      if (!questionCards || questionCards.length === 0) {
        throw new Error('No question cards found');
      }

      const screenshots = [];

      // Function to capture an individual element
      const captureElement = async (element, elementName) => {
        if (!element) {
          console.warn(`Element ${elementName} not found, skipping capture.`);
          return;
        }

        console.log(`Starting capture for ${elementName}`);

        // Method 1: Try direct capture of original element
        try {
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#0a0a0f',
            logging: false,
            scrollX: 0,
            scrollY: 0
          });

          console.log(`Direct capture dimensions for ${elementName}:`, canvas.width, 'x', canvas.height);

          // Check if canvas has actual content
          const ctx = canvas.getContext('2d');
          const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
          const hasContent = imageData.data.some((channel, index) => {
            return index % 4 === 3 ? channel > 0 : channel !== 10;
          });

          if (hasContent && canvas.height > 50) {
            const base64 = canvas.toDataURL('image/png');
            screenshots.push(base64);
            console.log(`Successfully captured ${elementName} directly`);
            return;
          }
        } catch (error) {
          console.warn(`Direct capture failed for ${elementName}:`, error);
        }

        // Method 2: Fallback to cloning method
        console.log(`Trying fallback method for ${elementName}`);
        
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
          position: fixed;
          top: -10000px;
          left: -10000px;
          width: 800px;
          background: #0a0a0f;
          visibility: visible;
          display: block;
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
        `;
        
        const clonedElement = element.cloneNode(true);
        
        // Copy all styles
        const computedStyles = window.getComputedStyle(element);
        Array.from(computedStyles).forEach(prop => {
          if (prop.includes('color') || prop.includes('background') || prop.includes('font') || 
              prop.includes('padding') || prop.includes('margin') || prop.includes('border') ||
              prop.includes('display') || prop.includes('visibility')) {
            clonedElement.style[prop] = computedStyles[prop];
          }
        });
        
        clonedElement.style.visibility = 'visible';
        clonedElement.style.display = 'block';
        clonedElement.style.opacity = '1';
        
        wrapper.appendChild(clonedElement);
        document.body.appendChild(wrapper);

        await new Promise(resolve => setTimeout(resolve, 300));

        try {
          const canvas = await html2canvas(wrapper, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#0a0a0f',
            width: 800,
            height: wrapper.scrollHeight,
            logging: false
          });

          if (canvas.height > 50) {
            const base64 = canvas.toDataURL('image/png');
            screenshots.push(base64);
            console.log(`Successfully captured ${elementName} with fallback`);
          } else {
            console.warn(`Fallback also failed for ${elementName}`);
          }

        } catch (error) {
          console.error(`Fallback capture failed for ${elementName}:`, error);
        } finally {
          if (wrapper.parentNode) {
            wrapper.parentNode.removeChild(wrapper);
          }
        }
      };

      // Capture Assessment Complete block first
      await captureElement(scoreCard, 'Assessment Complete');

      // Capture each question card individually
      for (let i = 0; i < questionCards.length; i++) {
        await captureElement(questionCards[i], `Question ${i + 1}`);
      }

      // Validate we have screenshots before proceeding
      if (screenshots.length === 0) {
        throw new Error('No valid screenshots captured');
      }

      console.log(`Total screenshots captured: ${screenshots.length}`);

      // Get YouTube video title from results
      const videoTitle = results.youtubeVideoId ? 
        (results.detailedResults[0]?.youtubevideotitle || 'Assessment') : 'Assessment';
      console.log('Video Title for PDF:', videoTitle);

      // Send all screenshots to backend for continuous PDF generation
      const res = await api.post(`/quiz/${quizId}/report-pdf/${attemptId}`, {
        images: screenshots,
        continuous: true, // Flag to indicate no gaps between images
        videoTitle: videoTitle
      }, {
        responseType: 'blob'
      });

      // Download the generated PDF with dynamic filename
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      const cleanTitle = videoTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      link.setAttribute('download', `${cleanTitle}_Assessment_Complete.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download report. Please try again.');
    } finally {
      // Reset button state
      if (downloadButtonRef.current) {
        downloadButtonRef.current.disabled = false;
        downloadButtonRef.current.innerHTML = '<Download size={16} /> Download PDF';
      }
    }
  };


  if (error) return <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--danger)' }}>{error}</div>;

  if (!results) return <div style={{ textAlign: 'center', marginTop: '4rem' }}>Loading Results...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href={`/personal/video/${results.videoId}`} className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} /> Return to Video Matrix
        </Link>
        <button ref={downloadButtonRef} onClick={handleDownload} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontSize: '14px' }}>
          <Download size={16} /> Extract PDF Report
        </button>
      </div>

      {/* Big Score Card */}
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem', marginBottom: '3rem', position: 'relative', overflow: 'hidden' }}>
        {results.totalScore >= 70 && (
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', opacity: 0.05, color: 'var(--emerald)' }}>
            <Trophy size={350} />
          </div>
        )}
        <h1 className="t-h4" style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>EVALUATION MATRIX COMPLETE</h1>
        <div style={{ 
          fontSize: '6rem', 
          fontWeight: '800', 
          lineHeight: 1, 
          fontFamily: 'var(--font-display)', 
          marginBottom: '2.5rem', 
          color: results.totalScore >= 70 ? 'var(--emerald)' : (results.totalScore >= 50 ? 'var(--yellow)' : 'var(--rose)')
        }}>
          {results.totalScore}%
        </div>
        
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyItems: 'center', gap: '2.5rem', background: 'var(--surface-1)', padding: '1.5rem 3rem', borderRadius: 'var(--radius-card)', border: '1px solid var(--stroke-1)' }}>
          <div style={{ textAlign: 'center' }}>
             <span style={{ display: 'block', fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>{results.correctAnswers}</span>
             <span className="t-small" style={{ color: 'var(--text-secondary)' }}>Valid</span>
          </div>
          <div style={{ width: '1px', background: 'var(--stroke-2)', height: '40px' }}></div>
          <div style={{ textAlign: 'center' }}>
             <span style={{ display: 'block', fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>{results.incorrectAnswers}</span>
             <span className="t-small" style={{ color: 'var(--text-secondary)' }}>Invalid</span>
          </div>
          <div style={{ width: '1px', background: 'var(--stroke-2)', height: '40px' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: results.coinsEarned >= 0 ? '#fbbf24' : 'var(--rose)' }}>
             <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>
               <Coins size={24} /> {results.coinsEarned >= 0 ? `+${results.coinsEarned}` : results.coinsEarned}
             </span>
             <span className="t-small">Credits</span>
          </div>
        </div>
      </div>

      {/* Detailed Review */}
      <h2 className="t-h3" style={{ marginBottom: '2rem' }}>Detailed Diagnostic Review</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {results.detailedResults.map((item, idx) => (
          <div key={idx} className="glass-card question-card" style={{ borderLeft: `2px solid ${item.isCorrect ? 'var(--emerald)' : 'var(--rose)'}`, position: 'relative', padding: '2rem' }}>
            {/* Confidence Badge */}
            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
              <span 
                className={`badge ${item.confidence === 'High' ? 'badge-emerald' : item.confidence === 'Low' ? 'badge-rose' : 'badge-yellow'}`} 
                style={{ fontFamily: 'var(--font-data)', textTransform: 'uppercase' }}
              >
                {item.confidence || 'Medium'}
              </span>
              {item.topic && (
                <span className="badge badge-cyan" style={{ fontFamily: 'var(--font-data)', textTransform: 'uppercase' }}>
                  {item.topic}
                </span>
              )}
            </div>
            
            <div style={{ paddingRight: '7rem', marginBottom: '2rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', lineHeight: 1.4, fontWeight: '600' }}>
                <span style={{ color: 'var(--cyan)', marginRight: '0.75rem', fontFamily: 'var(--font-data)' }}>[{idx + 1}]</span>
                {item.question}
              </h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ background: 'var(--surface-1)', padding: '1.25rem', border: '1px solid var(--stroke-1)', borderRadius: 'var(--radius-sm)' }}>
                <p className="t-small" style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Selected Input</p>
                <p style={{ fontWeight: '500', fontSize: '16px', color: item.isCorrect ? 'var(--emerald)' : 'var(--rose)' }}>
                  {item.selectedAnswer === 'No option selected' ? 'Null' : `Node ${item.selectedAnswer}`}
                </p>
              </div>
              <div style={{ background: 'var(--surface-1)', padding: '1.25rem', border: '1px solid var(--stroke-1)', borderRadius: 'var(--radius-sm)' }}>
                <p className="t-small" style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Expected Output</p>
                <p style={{ fontWeight: '500', fontSize: '16px', color: 'var(--emerald)' }}>Node {item.correctAnswer}</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <p className="t-small" style={{ color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
                  <FileText size={14} /> Diagnostic Explanation
                </p>
                <div style={{ fontSize: '14px', lineHeight: 1.6, background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontFamily: 'var(--font-data)' }}>
                  {item.explanation}
                </div>
              </div>

              {/* Video Context Section */}
              {item.youtubevideotitle && (
                <div>
                  <p className="t-small" style={{ color: 'var(--cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
                    Context Node Source
                  </p>
                  <div style={{ fontSize: '14px', lineHeight: 1.6, background: 'rgba(0, 200, 220, 0.05)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 200, 220, 0.2)', color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Video:</strong> {item.youtubevideotitle}
                    </div>
                    {extractStartTime(item.exacttimestamp) && (
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>Timestamp:</strong> {extractStartTime(item.exacttimestamp)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {item.sourceTimestamp?.transcriptExcerpt && (
                <div>
                  <p className="t-small" style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
                    Transcript Matrix Citation
                  </p>
                  <div style={{ fontSize: '14px', lineHeight: 1.6, fontStyle: 'italic', background: 'var(--surface-1)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--stroke-1)', color: 'var(--text-secondary)' }}>
                    "{item.sourceTimestamp.transcriptExcerpt}"
                  </div>
                </div>
              )}
            </div>
            
            {(item.exacttimestamp || item.sourceTimestamp) && (
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                 <span 
                   className="badge badge-cyan" 
                   style={{ cursor: 'pointer', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '14px', fontFamily: 'var(--font-data)' }}
                   onClick={() => {
                     const timestamp = extractStartTime(item.exacttimestamp) || '';
                     let youtubeUrl = '';
                     
                     if (results.youtubeUrl) {
                       const videoId = results.youtubeVideoId || 
                         results.youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];
                       
                       if (videoId && timestamp) {
                         let seconds = 0;
                         if (timestamp.includes(':')) {
                           const timeParts = timestamp.split(':');
                           if (timeParts.length === 3) {
                             seconds = parseInt(timeParts[0]) * 3600 + parseInt(timeParts[1]) * 60 + parseInt(timeParts[2]);
                           } else if (timeParts.length === 2) {
                             seconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
                           }
                         } else {
                           seconds = Math.floor(parseFloat(timestamp) || 0);
                         }
                         
                         youtubeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
                       } else if (videoId) {
                         youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
                       }
                     }
                     
                     if (youtubeUrl) {
                       window.open(youtubeUrl, '_blank');
                     } else {
                       window.open(`${window.location.origin}/personal/video/${results.videoId}?t=${timestamp}`, '_blank');
                     }
                   }}
                 >
                   EXECUTE SOURCE REPLAY [{extractStartTime(item.exacttimestamp) || '0:00'}]
                 </span>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
