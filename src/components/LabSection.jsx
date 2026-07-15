import { useState, useEffect } from 'react';
import { FlaskConical, Clock, CheckCircle, Lock, ArrowRight, Search } from 'lucide-react';

export default function LabSection({ setActiveView, setViewId }) {
  const [labs, setLabs] = useState([]);
  const [progress, setProgress] = useState({ solved: [] });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch lab catalog
    fetch('/src/data/labs.json')
      .then(res => res.json())
      .then(data => setLabs(data))
      .catch(err => console.error("Error loading labs:", err));

    // Load progress from local storage (simulate reading from file for now)
    const saved = localStorage.getItem('hole_lab_progress');
    if (saved) {
      try { setProgress(JSON.parse(saved)); } catch(e) {}
    }
  }, []);

  const filteredLabs = labs.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const solvedCount = labs.filter(l => progress.solved.includes(l.id)).length;

  return (
    <div className="page-enter" style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div className="pro-icon-glow">
              <FlaskConical size={28} color="var(--accent-primary)" />
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Training Labs</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: 0 }}>Simulated environments based on real bug bounty findings.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progress</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-primary)' }}>{solvedCount} / {labs.length} Solved</span>
          </div>
          <div style={{ width: '1px', height: '40px', background: 'var(--border-subtle)' }} />
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search labs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', padding: '10px 10px 10px 36px', 
                background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', 
                borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' 
              }}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
        {filteredLabs.map(lab => {
          const isSolved = progress.solved.includes(lab.id);
          
          return (
            <div key={lab.id} className={`lab-card ${isSolved ? 'solved' : ''}`} onClick={() => { setViewId(lab.id); setActiveView('lab-runner'); }} data-level={lab.difficulty}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span className="lab-difficulty" data-level={lab.difficulty}>{lab.difficulty}</span>
                {isSolved ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22C55E', fontSize: '12px', fontWeight: 700 }}>
                    <CheckCircle size={16} /> SOLVED
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
                    <Lock size={16} /> UNSOLVED
                  </div>
                )}
              </div>
              
              <h2 className="lab-title">{lab.title}</h2>
              <p className="lab-desc">{lab.description}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600 }}>
                  <Clock size={14} /> {lab.estimatedTime}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isSolved ? '#22C55E' : 'var(--accent-primary)', fontSize: '14px', fontWeight: 700 }}>
                  {isSolved ? 'Review Lab' : 'Start Lab'} <ArrowRight size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .lab-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        .lab-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        .lab-card[data-level="Beginner"]:hover { border-color: var(--accent-primary); box-shadow: 0 8px 30px rgba(59, 130, 246, 0.2); }
        .lab-card[data-level="Intermediate"]:hover { border-color: #F59E0B; box-shadow: 0 8px 30px rgba(245, 158, 11, 0.2); }
        .lab-card[data-level="Advanced"]:hover { border-color: #F97316; box-shadow: 0 8px 30px rgba(249, 115, 22, 0.2); }
        .lab-card[data-level="Critical"]:hover { border-color: #EF4444; box-shadow: 0 8px 30px rgba(239, 68, 68, 0.3); }
        .lab-card.solved {
          border-color: rgba(34, 197, 94, 0.3);
        }
        .lab-card.solved:hover {
          border-color: #22C55E;
        }
        .lab-difficulty {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
        }
        .lab-difficulty[data-level="Beginner"] { color: #22C55E; }
        .lab-difficulty[data-level="Intermediate"] { color: #F59E0B; }
        .lab-difficulty[data-level="Advanced"] { color: #F43F5E; }
        .lab-difficulty[data-level="Critical"] { color: #EF4444; text-shadow: 0 0 10px rgba(239,68,68,0.5); }
        
        .lab-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 12px 0;
          line-height: 1.3;
        }
        .lab-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 24px 0;
        }
      `}</style>
    </div>
  );
}
