import React, { useState, useEffect } from 'react';
import { Target, Search, Trash2, Plus, ArrowLeft, ShieldAlert, CheckCircle2, RotateCcw, AlertTriangle, Play, ShieldCheck } from 'lucide-react';
import { readFileDirect } from '../utils/fileSystem';
import ConfirmModal from './ConfirmModal';
import WildcardScanner from './WildcardScanner';
import '../styles/Tools.css';

export default function TargetCommand({ storageDir, fsUpdateTrigger, onLaunchRecon }) {
  // State for all saved programs
  const [programs, setPrograms] = useState({});
  const [activeProgramId, setActiveProgramId] = useState(null);
  const [activeScanTarget, setActiveScanTarget] = useState(null); // wildcard domain being scanned
  
  // UI states
  const [urlInput, setUrlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  const getProgramsPath = () => storageDir ? `${storageDir}/TargetCommand/programs.json` : null;
  const getResultsPath = (programId, target) => {
    if (!storageDir) return null;
    const safeTarget = target.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${storageDir}/TargetCommand/results_${programId}_${safeTarget}.json`;
  };

  useEffect(() => {
    const loadPrograms = async () => {
      const path = getProgramsPath();
      if (!path) return;
      const res = await readFileDirect(path);
      if (res.success) {
        try {
          const data = JSON.parse(res.content);
          if (data.programs) setPrograms(data.programs);
        } catch (e) {}
      }
    };
    loadPrograms();
  }, [storageDir, fsUpdateTrigger]);

  const savePrograms = async (newPrograms) => {
    const path = getProgramsPath();
    if (!path || !window.electronAPI) return;
    try {
      await window.electronAPI.saveFileDirect({
        filePath: path,
        content: JSON.stringify({ version: '1.0', programs: newPrograms }, null, 2)
      });
      setPrograms(newPrograms);
    } catch (e) {
      setErrorMsg('Failed to save program data.');
    }
  };

  const saveScanResults = async (programId, target, data) => {
    const path = getResultsPath(programId, target);
    if (!path || !window.electronAPI) return;
    try {
      await window.electronAPI.saveFileDirect({
        filePath: path,
        content: JSON.stringify(data, null, 2)
      });
    } catch (e) {
      console.error('Failed to save scan results');
    }
  };

  const handleParseUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setIsParsing(true);
    setErrorMsg('');
    try {
      const savedSettings = JSON.parse(localStorage.getItem('kroma_settings') || '{}');
      const apiKeys = savedSettings.apiKeys || {};
      const res = await window.electronAPI.targetCommandParse({ url: urlInput.trim(), apiKeys });
      if (res.success) {
        const pId = Date.now().toString();
        const newProgs = { ...programs, [pId]: { id: pId, addedAt: new Date().toISOString(), ...res } };
        await savePrograms(newProgs);
        setUrlInput('');
      } else {
        setErrorMsg(res.error || 'Failed to parse program.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const deleteProgram = (id, e) => {
    if (e) e.stopPropagation();
    setConfirmModal({
      title: 'Delete Program',
      message: 'Are you sure you want to completely delete this program and all its saved scan data? This cannot be undone.',
      onConfirm: () => {
        const updated = { ...programs };
        delete updated[id];
        savePrograms(updated);
        if (activeProgramId === id) {
          setActiveProgramId(null);
          setActiveScanTarget(null);
        }
        setConfirmModal(null);
      }
    });
  };

  const handleTargetClick = async (target, type) => {
    if (type !== 'WILDCARD') {
      setErrorMsg(`Warning: ${target} is marked as an exact domain, not a wildcard. Scanning subdomains here is INVALID and strictly Out of Scope.`);
      setTimeout(() => setErrorMsg(''), 5000);
      return;
    }
    const cleanTarget = target.replace('*.', '');
    setActiveScanTarget(cleanTarget);
  };

  // 0. WILDCARD SCANNER VIEW
  if (activeScanTarget && activeProgramId) {
    const activeProgram = programs[activeProgramId];
    return (
      <WildcardScanner
        domain={activeScanTarget}
        programName={activeProgram?.programName || 'Unknown'}
        storageDir={storageDir}
        onBack={() => setActiveScanTarget(null)}
      />
    );
  }

  // 1. MAIN DASHBOARD VIEW
  if (!activeProgramId) {
    return (
      <div className="pro-section">
        <div className="pro-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="pro-icon-container"><Target size={20} color="var(--accent-primary)" /></div>
            <div>
              <h1 className="pro-title">Target Command</h1>
              <p className="pro-subtitle">Mission Control Center. Paste a Bug Bounty program URL to extract scope and automate recon.</p>
            </div>
          </div>
        </div>
        
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <form onSubmit={handleParseUrl} style={{ display: 'flex', gap: '12px', marginBottom: '32px', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Program URL</label>
              <input type="text" className="pro-input" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://hackerone.com/shopify" />
            </div>
            <button type="submit" className="pro-button primary" disabled={isParsing || !urlInput} style={{ height: '42px', padding: '0 24px' }}>
              {isParsing ? <><span className="pro-spinner"></span>Parsing...</> : <><Search size={16} />Extract Program</>}
            </button>
          </form>

          {errorMsg && (
            <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <ShieldAlert size={20} /><span style={{ fontSize: '14px', fontWeight: 600 }}>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {Object.values(programs).sort((a,b) => new Date(b.addedAt) - new Date(a.addedAt)).map(prog => (
              <div key={prog.id} onClick={() => setActiveProgramId(prog.id)} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }} className="hover-lift">
                <button onClick={(e) => deleteProgram(prog.id, e)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.6 }} className="hover-red">
                  <Trash2 size={16} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Target size={20} color="#8B5CF6" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>{prog.programName}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{prog.platform}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                  <div style={{ color: '#22C55E' }}><strong>{prog.inScope?.length || 0}</strong> In Scope</div>
                  <div style={{ color: '#EF4444' }}><strong>{prog.outOfScope?.length || 0}</strong> Out of Scope</div>
                </div>
              </div>
            ))}
          </div>

          {confirmModal && <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(null)} />}
        </div>
      </div>
    );
  }

  // 2. SPECIFIC PROGRAM VIEW
  const activeProgram = programs[activeProgramId];
  return (
    <div className="pro-section">
      <div className="pro-header" style={{ paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => { setActiveProgramId(null); setActiveScanTarget(null); setWildcardResults(null); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="pro-title">{activeProgram.programName}</h1>
            <p className="pro-subtitle">{activeProgram.platform} • <a href={activeProgram.url} target="_blank" rel="noreferrer" style={{color:'#3B82F6'}}>{activeProgram.url}</a></p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        {errorMsg && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <AlertTriangle size={20} /><span style={{ fontSize: '14px', fontWeight: 600 }}>{errorMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* Left Column - Scope */}
          <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* IN SCOPE CARD */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', padding: '16px', borderBottom: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="#22C55E" />
                <h3 style={{ margin: 0, color: '#22C55E', fontSize: '15px', fontWeight: 700 }}>In Scope Targets</h3>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>Click a Wildcard to scan</span>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
                {activeProgram.inScope?.length > 0 ? activeProgram.inScope.map((item, i) => (
                  <div key={i} onClick={() => handleTargetClick(item.asset, item.type)} 
                       style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.2s' }}
                       className="hover-border-primary">
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#fff', fontWeight: item.type === 'WILDCARD' ? 700 : 400 }}>{item.asset}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: item.type === 'WILDCARD' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)', color: item.type === 'WILDCARD' ? '#8B5CF6' : 'var(--text-muted)', fontWeight: 700 }}>{item.type}</span>
                  </div>
                )) : <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No targets found or extracted.</div>}
              </div>
            </div>

            {/* OUT OF SCOPE CARD */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', padding: '16px', borderBottom: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="#EF4444" />
                <h3 style={{ margin: 0, color: '#EF4444', fontSize: '15px', fontWeight: 700 }}>Out of Scope Targets</h3>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {activeProgram.outOfScope?.length > 0 ? activeProgram.outOfScope.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', backgroundColor: 'rgba(239,68,68,0.05)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#EF4444', opacity: 0.8, textDecoration: 'line-through' }}>{item.asset}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.type}</span>
                  </div>
                )) : <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No specific out of scope targets found.</div>}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
