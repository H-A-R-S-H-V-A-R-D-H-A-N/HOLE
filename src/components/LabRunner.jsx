import { useState, useEffect } from 'react';
import { ArrowLeft, Terminal, CheckCircle, Copy, AlertTriangle, BookOpen, ChevronRight, Award, Server, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';

export default function LabRunner({ setActiveView, viewId, setViewId }) {
  const id = viewId;
  const [lab, setLab] = useState(null);
  const [flagInput, setFlagInput] = useState('');
  const [status, setStatus] = useState('idle'); // idle, error, solved
  const [hintIndex, setHintIndex] = useState(0);
  const [copied, setCopied] = useState('');
  const [showCertificate, setShowCertificate] = useState(false);
  const [certHash, setCertHash] = useState('');
  const [certName, setCertName] = useState('');
  const [hasCert, setHasCert] = useState(false);

  useEffect(() => {
    fetch('/src/data/labs.json')
      .then(res => res.json())
      .then(data => {
        const found = data.find(l => l.id === id);
        setLab(found);
        
        // Check if already solved
        const saved = localStorage.getItem('hole_lab_progress');
        if (saved) {
          const prog = JSON.parse(saved);
          if (prog.solved.includes(id)) {
            setStatus('solved');
          }
        }

        // Check if certificate exists
        const savedCert = localStorage.getItem(`hole_lab_cert_${id}`);
        if (savedCert) {
          const cert = JSON.parse(savedCert);
          setCertName(cert.name);
          setCertHash(cert.hash);
          setHasCert(true);
        }
      })
      .catch(err => console.error("Error loading lab:", err));
  }, [id]);

  const handleCopy = (text, id) => {
    if (copied === id) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleFlagSubmit = (e) => {
    e.preventDefault();
    if (flagInput.trim() === lab.flag) {
      setStatus('solved');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      
      const newHash = Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');
      setCertHash(newHash);
      
      // Save progress
      const saved = localStorage.getItem('hole_lab_progress');
      const prog = saved ? JSON.parse(saved) : { solved: [], dates: {} };
      if (!prog.solved.includes(lab.id)) {
        prog.solved.push(lab.id);
        prog.dates[lab.id] = new Date().toISOString();
        localStorage.setItem('hole_lab_progress', JSON.stringify(prog));
      }
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  if (!lab) return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading lab environment...</div>;

  return (
    <div className="page-enter" style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
      
      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', padding: '32px 64px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <button 
            onClick={() => setActiveView('labs')}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '24px', padding: 0, fontSize: '14px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Back to Labs
          </button>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <span className="lab-difficulty" data-level={lab.difficulty}>{lab.difficulty}</span>
          </div>
          
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>{lab.title}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', margin: '0 0 24px 0', lineHeight: 1.6, maxWidth: '800px' }}>
            {lab.description}
          </p>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn btn-ghost" onClick={() => { setViewId(lab.blogId); setActiveView('blog-reader'); }}>
              <BookOpen size={16} /> Read Associated Writeup
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 64px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '48px' }}>
        
        {/* Left Column: Instructions */}
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', margin: '0 0 24px 0', color: 'var(--text-primary)' }}>
            <Server size={20} color="var(--accent-primary)" /> 1. Start the Environment
          </h3>
          
          <div className="info-box" style={{ marginBottom: '32px' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-secondary)' }}><strong>Note:</strong> You need <a href="https://docs.docker.com/get-docker/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>Docker</a> installed on your machine to run this lab locally.</p>
            <div style={{ background: 'var(--bg-deep)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                <span>Terminal (Copy & Run)</span>
              </div>
              
              <div className="code-line">
                <code>{lab.commands.pull}</code>
                <button onClick={() => handleCopy(lab.commands.pull, 'pull')}>{copied === 'pull' ? <CheckCircle size={14} color="#22c55e" /> : <Copy size={14} />}</button>
              </div>
              <div className="code-line" style={{ marginTop: '12px' }}>
                <code>{lab.commands.run}</code>
                <button onClick={() => handleCopy(lab.commands.run, 'run')}>{copied === 'run' ? <CheckCircle size={14} color="#22c55e" /> : <Copy size={14} />}</button>
              </div>
            </div>
            
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '12px 16px', borderRadius: '8px' }}>
              <CheckCircle size={18} color="#22c55e" />
              <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Lab will be available at: <a href={`http://localhost:${lab.port}`} target="_blank" rel="noreferrer" style={{ color: '#22c55e', fontWeight: 700 }}>http://localhost:{lab.port}</a></span>
            </div>
          </div>

          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px', margin: '0 0 24px 0', color: 'var(--text-primary)' }}>
            <Terminal size={20} color="var(--accent-primary)" /> 2. Submit Flag
          </h3>
          
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '32px' }}>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '15px' }}>
              <strong>Objective:</strong> {lab.objective}
            </p>
            
            {status === 'solved' ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Award size={64} color="#22C55E" style={{ margin: '0 auto 16px' }} />
                <h2 style={{ margin: '0 0 8px 0', color: '#22C55E' }}>Lab Conquered!</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>You successfully exploited the vulnerability and found the flag.</p>
                <div style={{ maxWidth: '300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {!hasCert && (
                    <input
                      type="text"
                      placeholder="Enter your name..."
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep)', color: 'var(--text-primary)', outline: 'none', textAlign: 'center', fontSize: '16px' }}
                    />
                  )}
                  <button 
                    className="btn btn-primary" 
                    disabled={!certName.trim()}
                    onClick={() => {
                      if (!hasCert) {
                        localStorage.setItem(`hole_lab_cert_${id}`, JSON.stringify({ name: certName.trim(), hash: certHash }));
                        setHasCert(true);
                      }
                      setShowCertificate(true);
                    }}
                    style={{ background: certName.trim() ? '#22C55E' : 'var(--bg-tertiary)', borderColor: certName.trim() ? '#22C55E' : 'var(--border-subtle)', color: certName.trim() ? '#000' : 'var(--text-muted)' }}
                  >
                    {hasCert ? 'View Certificate' : 'Generate Certificate'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFlagSubmit} style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="HOLE{...}"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  className={status === 'error' ? 'shake-error' : ''}
                  style={{
                    flex: 1, padding: '14px 16px', fontSize: '16px', fontFamily: 'JetBrains Mono, monospace',
                    background: 'var(--bg-deep)', border: `1px solid ${status === 'error' ? '#EF4444' : 'var(--border-subtle)'}`,
                    borderRadius: '8px', color: 'var(--text-primary)', outline: 'none'
                  }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 24px' }}>
                  Submit
                </button>
              </form>
            )}
            
            {status === 'error' && <p style={{ color: '#EF4444', fontSize: '13px', margin: '8px 0 0 0', fontWeight: 600 }}>Incorrect flag. Keep trying!</p>}
          </div>

          <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-muted)' }}>Cleanup</h4>
            <div className="code-line">
              <code>{lab.commands.stop}</code>
              <button onClick={() => handleCopy(lab.commands.stop, 'stop')}>{copied === 'stop' ? <CheckCircle size={14} color="#22c55e" /> : <Copy size={14} />}</button>
            </div>
          </div>
        </div>
        
        {/* Right Column: Hints */}
        <div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px', position: 'sticky', top: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <AlertTriangle size={16} color="#F59E0B" /> Hints
            </h4>
            
            {lab.hints.map((hint, idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                {idx < hintIndex ? (
                  <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid #F59E0B', borderRadius: '0 4px 4px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {hint}
                  </div>
                ) : idx === hintIndex ? (
                  <button 
                    onClick={() => setHintIndex(idx + 1)}
                    style={{ width: '100%', padding: '12px', background: 'var(--bg-tertiary)', border: '1px dashed var(--border-subtle)', borderRadius: '4px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    Reveal Hint {idx + 1} <ChevronRight size={14} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertificate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }} onClick={() => setShowCertificate(false)}>
          <div style={{ background: '#0b0f19', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '48px', maxWidth: '800px', width: '100%', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 100px rgba(59, 130, 246, 0.2)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowCertificate(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            
            {/* The Certificate Art */}
            <div id="hole-certificate" style={{ border: '2px solid var(--border-subtle)', padding: '12px', borderRadius: '12px', background: 'var(--bg-deep)' }}>
              <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '48px', borderRadius: '8px', background: 'linear-gradient(135deg, #0b0f19 0%, #111827 100%)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 50%)', pointerEvents: 'none' }}></div>
                
                <h1 style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '32px', letterSpacing: '8px', margin: '0 0 16px 0', textTransform: 'uppercase' }}>CERTIFICATE</h1>
                <p style={{ color: 'var(--accent-primary)', fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '48px', fontWeight: 600 }}>OF VULNERABILITY EXPLOITATION</p>
                
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '8px' }}>This certifies that</p>
                <h2 style={{ color: '#F97316', fontSize: '32px', marginBottom: '8px', fontFamily: 'monospace' }}>{certName}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '16px' }}>has successfully conquered</p>
                <h2 style={{ color: '#fff', fontSize: '28px', marginBottom: '48px', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>{lab.title}</h2>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '64px' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '8px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '16px' }}>{new Date().toLocaleDateString()}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Date of Completion</div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Shield size={48} color="var(--accent-primary)" style={{ marginBottom: '12px' }} />
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '2px' }}>HOLE WORKSTATION</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '8px', fontFamily: 'monospace' }}>Verify: {certHash || 'f9a2b4c6e8d01...'}</span>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '8px', color: '#EF4444', fontFamily: 'monospace', fontSize: '16px', fontWeight: 700 }}>CRITICAL</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Vulnerability Level</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '32px' }}>
              <button 
                onClick={() => {
                  const element = document.getElementById('hole-certificate');
                  html2canvas(element, { scale: 2, backgroundColor: '#0b0f19' }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `HOLE_Certificate_${lab.id}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                  });
                }}
                style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)', padding: '12px 32px', borderRadius: '30px', fontWeight: 600, border: '1px solid var(--border-subtle)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Copy size={18} /> Download Image
              </button>
              
              <button 
                onClick={() => {
                  const text = encodeURIComponent(`I just conquered the ${lab.title} vulnerability lab on the HOLE Bug Bounty Workstation! 🛡️👾\n\nVerify my cert: ${certHash}\n\nTry it yourself: https://github.com/holeworkstation/hole\n\n#BugBounty #CyberSecurity #HOLEworkstation`);
                  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                }}
                style={{ background: '#1DA1F2', color: '#fff', padding: '12px 32px', borderRadius: '30px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Share on X (Twitter)
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
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
        
        .code-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-deep);
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid var(--accent-primary-dim);
          box-shadow: 0 0 20px var(--accent-primary-glow), 0 0 5px var(--accent-primary-dim);
          position: relative;
        }
        .code-line code {
          font-family: 'JetBrains Mono', monospace;
          color: #A3E635;
          font-size: 13px;
        }
        .code-line button {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
        }
        .code-line button:hover {
          color: var(--text-primary);
        }
        
        .shake-error {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
}
