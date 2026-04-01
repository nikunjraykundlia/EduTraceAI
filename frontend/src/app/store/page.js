'use client';

import { useState, useEffect, useRef } from 'react';
import { useCoins } from '@/context/CoinsContext';
import { Trophy, Star, Shield, Zap, Lock, Unlock } from 'lucide-react';
import api from '@/lib/api';
// We are re-using some patterns from Dashboard css conceptually but keeping them inline for the store

export default function StorePage() {
  const { coins, updateCoins } = useCoins();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  // For mouse tracking effect
  const cardRefs = useRef([]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await api.get('/store/items');
        if (res.data.success) {
          setItems(res.data.items);
          // Initialize refs array based on items length
          cardRefs.current = cardRefs.current.slice(0, res.data.items.length);
        }
      } catch (err) {
        console.error('Failed to fetch store items:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleRedeem = async (item) => {
    if (coins < item.cost) {
      alert("Insufficient credits for transfer.");
      return;
    }
    
    setPurchasing(item._id);
    
    try {
      const res = await api.post('/store/redeem', { itemId: item._id });
      if(res.data.success) {
        updateCoins(res.data.remainingCoins);
        alert(`Successfully unlocked asset: ${item.name}`);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Exchange validation negative.");
    } finally {
      setPurchasing(null);
    }
  };

  const handleMouseMove = (e, index) => {
    const ref = cardRefs.current[index];
    if (!ref) return;
    const rect = ref.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.style.setProperty('--mouse-x', `${x}px`);
    ref.style.setProperty('--mouse-y', `${y}px`);
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '4rem', fontFamily: 'var(--font-data)' }}>Establishing Marketplace Uplink...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4rem', textAlign: 'center' }}>
        <h1 className="t-h3" style={{ marginBottom: '0.5rem' }}>RESOURCE EXCHANGE</h1>
        <p className="t-small" style={{ color: 'var(--text-secondary)' }}>Allocate earned credits for system enhancements and artifacts.</p>

        <div style={{ marginTop: '2rem', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--yellow)' }}></span>
            Available Balance
          </span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 'bold', color: 'var(--yellow)', lineHeight: '1', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {coins}
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>CRD</span>
          </div>
        </div>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {items.map((item, index) => (
          <div 
            key={item._id} 
            ref={el => cardRefs.current[index] = el}
            onMouseMove={(e) => handleMouseMove(e, index)}
            className="store-card"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%', 
              position: 'relative', 
              overflow: 'hidden',
              background: 'var(--surface-1)',
              border: '1px solid var(--stroke-2)',
              borderRadius: 'var(--radius-card)',
              transition: 'border-color 0.3s ease, transform 0.3s ease',
              '--mouse-x': '50%',
              '--mouse-y': '50%'
            }}
          >
            {/* Top highlight line */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'var(--yellow)' }}></div>

            {/* Radial hover effect container */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(100vh circle at var(--mouse-x) var(--mouse-y), rgba(251, 191, 36, 0.05), transparent 40%)',
              opacity: 0,
              transition: 'opacity 0.3s',
              pointerEvents: 'none',
              zIndex: 0
            }} className="hover-halo"></div>
            
            <div style={{ padding: '2.5rem 0', display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
               <div style={{ 
                 background: 'var(--surface-0)', 
                 padding: '1.5rem', 
                 borderRadius: 'var(--radius-md)', 
                 border: '1px solid var(--stroke-1)',
                 color: 'var(--yellow)'
               }}>
                 {item.icon}
               </div>
            </div>

            <div style={{ flex: 1, textAlign: 'center', padding: '0 1.5rem', position: 'relative', zIndex: 1 }}>
              <h3 className="t-h4" style={{ marginBottom: '0.75rem', color: 'var(--text-primary)' }}>{item.name}</h3>
              <p className="t-small" style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{item.description}</p>
            </div>

            <div style={{ marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid var(--stroke-1)', position: 'relative', zIndex: 1, background: 'var(--surface-0)' }}>
              <button 
                onClick={() => handleRedeem(item)} 
                className={`btn ${coins >= item.cost ? 'btn-primary' : 'btn-secondary'}`} 
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontFamily: 'var(--font-data)',
                  textTransform: 'uppercase',
                  border: coins >= item.cost ? '1px solid var(--yellow)' : undefined,
                  background: coins >= item.cost ? 'rgba(251, 191, 36, 0.1)' : undefined,
                  color: coins >= item.cost ? 'var(--yellow)' : 'var(--text-muted)'
                }}
                disabled={coins < item.cost || purchasing === item._id}
              >
                {purchasing === item._id ? 'Validating...' : (
                  <>
                    {coins >= item.cost ? <Unlock size={14} /> : <Lock size={14} />}
                    <span style={{ marginLeft: '0.5rem' }}>{item.cost} CRD</span>
                  </>
                )}
              </button>
            </div>

          </div>
        ))}
      </div>
      <style jsx>{`
        .store-card:hover {
          border-color: var(--stroke-1);
        }
        .store-card:hover .hover-halo {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
