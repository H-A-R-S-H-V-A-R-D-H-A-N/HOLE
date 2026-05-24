import { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, Square, Trash2, Edit3, Check, X, Maximize2, Minimize2, Clock, RotateCcw } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { readFileDirect } from '../utils/fileSystem';
import '../styles/Tools.css';

export default function TimeTracker({ storageDir, fsUpdateTrigger }) {
  const [sessions, setSessions] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [programName, setProgramName] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeProgram, setActiveProgram] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editHours, setEditHours] = useState('');
  const [editMinutes, setEditMinutes] = useState('');
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const [confirmState, setConfirmState] = useState(null);

  const getTrackerPath = () => {
    return storageDir ? `${storageDir}/TimeTracker/sessions.json` : null;
  };

  const getJournalPath = () => {
    return storageDir ? `${storageDir}/Journal/HackerJournal_data.json` : null;
  };

  // Load Initial Data
  useEffect(() => {
    const loadData = async () => {
      const path = getTrackerPath();
      if (!path) {
        setIsLoaded(true);
        return;
      }
      try {
        const result = await readFileDirect(path);
        if (result.success) {
          const data = JSON.parse(result.content);
          if (data.sessions) setSessions(data.sessions);
        }
      } catch (e) {
        console.warn('Failed to parse Time Tracker data:', e);
      }
      setIsLoaded(true);
    };
    loadData();
  }, [storageDir, fsUpdateTrigger]);

  // Save helper - called explicitly, NOT on every state change
  const saveSessions = async (updatedSessions) => {
    const path = getTrackerPath();
    if (!path || !window.electronAPI) return;
    try {
      await window.electronAPI.saveFileDirect({
        filePath: path,
        content: JSON.stringify({ version: '1.0', sessions: updatedSessions }, null, 2)
      });
    } catch (e) {
      console.error('Failed to save Time Tracker data', e);
    }
  };

  // Handle Intervals
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const startSession = () => {
    if (!programName.trim()) return;
    setActiveProgram(programName.trim());
    setIsRunning(true);
    setElapsed(0);
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const startFromHistory = (program) => {
    setProgramName(program);
    setActiveProgram(program);
    setIsRunning(true);
    setElapsed(0);
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const resetProgram = (program) => {
    setConfirmState({
      title: 'Reset Program',
      message: `Reset all tracked time for "${program}"? This cannot be undone.`,
      onConfirm: () => {
        const updated = sessions.filter(s => s.program !== program);
        setSessions(updated);
        saveSessions(updated);
        setConfirmState(null);
      }
    });
  };

  const pauseSession = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
  };

  const resumeSession = () => {
    const pausedElapsed = elapsed;
    startTimeRef.current = Date.now() - (pausedElapsed * 1000);
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  // Helper to log to HackerJournal
  const logToJournal = async (program, totalSeconds) => {
    const journalPath = getJournalPath();
    if (!journalPath || !window.electronAPI) return;

    try {
      const result = await readFileDirect(journalPath);
      let journalData = { entries: {} };
      if (result.success) {
        try { journalData = JSON.parse(result.content); } catch (e) {}
      }

      // Format time
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      
      const targetDate = new Date().toISOString().split('T')[0];
      const entryText = `⏱️ Session Complete: Spent ${timeStr} hacking on ${program}`;
      
      if (!journalData.entries[targetDate]) {
        journalData.entries[targetDate] = [];
      }
      
      journalData.entries[targetDate].push({
        text: entryText,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        starred: true // Auto-star time tracking logs for visibility
      });

      await window.electronAPI.saveFileDirect({
        filePath: journalPath,
        content: JSON.stringify(journalData, null, 2)
      });
      console.log('Successfully logged session to Hacker Journal');
    } catch (err) {
      console.error('Failed to log session to journal', err);
    }
  };

  const stopSession = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (elapsed > 0) {
      const newSession = {
        id: Date.now().toString(),
        program: activeProgram,
        duration: elapsed,
        date: new Date().toISOString(),
      };
      const updated = [...sessions, newSession];
      setSessions(updated);
      await saveSessions(updated);
      
      // Automatically log this session into the Hacker Journal
      await logToJournal(activeProgram, elapsed);
    }
    
    setIsRunning(false);
    setElapsed(0);
    setActiveProgram('');
  };

  const deleteSession = (id) => {
    setConfirmState({
      title: 'Delete Session',
      message: 'Are you sure you want to delete this session?',
      onConfirm: () => {
        const updated = sessions.filter(s => s.id !== id);
        setSessions(updated);
        saveSessions(updated);
        setConfirmState(null);
      }
    });
  };

  const startEditSession = (session) => {
    setEditingId(session.id);
    const h = Math.floor(session.duration / 3600);
    const m = Math.floor((session.duration % 3600) / 60);
    setEditHours(h.toString());
    setEditMinutes(m.toString());
  };

  const saveEditSession = (id) => {
    const totalSecs = (parseInt(editHours) || 0) * 3600 + (parseInt(editMinutes) || 0) * 60;
    const updated = sessions.map(s => s.id === id ? { ...s, duration: totalSecs } : s);
    setSessions(updated);
    saveSessions(updated);
    setEditingId(null);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const programStats = {};
  sessions.forEach(s => {
    if (!programStats[s.program]) programStats[s.program] = { totalSeconds: 0, sessions: 0 };
    programStats[s.program].totalSeconds += s.duration;
    programStats[s.program].sessions += 1;
  });
  const totalHours = sessions.reduce((sum, s) => sum + s.duration, 0);

  // Fullscreen timer view
  if (isFullscreen) {
    return (
      <div className="timer-fullscreen">
        <button className="timer-fs-exit" onClick={() => setIsFullscreen(false)}>
          <Minimize2 size={20} />
        </button>
        <div className="timer-fs-digits" style={{ textShadow: '0 0 40px rgba(139, 92, 246, 0.4)', color: isRunning ? '#8B5CF6' : 'var(--text-primary)' }}>
          {formatTime(elapsed)}
        </div>
        {activeProgram && (
          <div className="timer-fs-program" style={{ color: 'var(--text-secondary)' }}>{activeProgram}</div>
        )}
        <div className="timer-controls" style={{ marginTop: '32px' }}>
          {isRunning ? (
            <button className="btn btn-secondary btn-lg" onClick={pauseSession} style={{ padding: '16px 32px', fontSize: '18px' }}>
              <Pause size={24} /> Pause
            </button>
          ) : elapsed > 0 ? (
            <button className="btn btn-primary btn-lg" onClick={resumeSession} style={{ padding: '16px 32px', fontSize: '18px' }}>
              <Play size={24} /> Resume
            </button>
          ) : null}
          {(isRunning || elapsed > 0) && (
            <button className="btn btn-danger btn-lg" onClick={() => { stopSession(); setIsFullscreen(false); }} style={{ padding: '16px 32px', fontSize: '18px', background: 'linear-gradient(135deg, #EF4444, #B91C1C)', border: 'none' }}>
              <Square size={24} /> Stop & Log to Journal
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tool-page page-enter">
      <div className="tool-header" style={{ marginBottom: '32px' }}>
        <div className="tool-header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
            <Timer size={24} color="#fff" />
          </div>
          <div>
            <h1 className="tool-title" style={{ fontSize: '22px', fontWeight: 800 }}>Time Tracker</h1>
            <p className="tool-subtitle" style={{ margin: 0 }}>Track hunting hours. Stops automatically log directly into your Hacker Journal.</p>
          </div>
        </div>
        {(isRunning || elapsed > 0) && (
          <button className="btn btn-secondary" onClick={() => setIsFullscreen(true)} style={{ border: '1px solid var(--border-default)' }}>
            <Maximize2 size={16} /> Fullscreen Focus
          </button>
        )}
      </div>

      {/* Timer Section */}
      <div className="timer-main" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '16px', padding: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <div className="timer-display" style={{ marginBottom: '24px' }}>
          <span className={`timer-digits ${isRunning ? 'timer-running' : ''}`} style={{ fontSize: '64px', fontWeight: 800, letterSpacing: '-2px', color: isRunning ? '#10B981' : 'var(--text-primary)' }}>
            {formatTime(elapsed)}
          </span>
          {activeProgram && (
            <span className="timer-program-label" style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
              Hunting on: <strong style={{ color: 'var(--text-primary)' }}>{activeProgram}</strong>
            </span>
          )}
        </div>

        {!activeProgram ? (
          <div className="timer-start-form" style={{ display: 'flex', gap: '12px', maxWidth: '600px', margin: '0 auto' }}>
            <input
              className="tool-input"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="Program name (e.g., HackerOne - Shopify)"
              onKeyDown={(e) => e.key === 'Enter' && startSession()}
              style={{ flex: 1, padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '10px', fontSize: '15px' }}
            />
            <button className="btn btn-primary" onClick={startSession} style={{ padding: '0 24px', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)' }}>
              <Play size={16} /> Start Session
            </button>
          </div>
        ) : (
          <div className="timer-controls" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {isRunning ? (
              <button className="btn btn-secondary" onClick={pauseSession} style={{ padding: '10px 24px', borderRadius: '10px', fontWeight: 600 }}>
                <Pause size={16} /> Pause
              </button>
            ) : (
              <button className="btn btn-primary" onClick={resumeSession} style={{ padding: '10px 24px', borderRadius: '10px', fontWeight: 600, background: 'var(--bg-elevated)', color: '#10B981', border: '1px solid #10B98150' }}>
                <Play size={16} /> Resume
              </button>
            )}
            <button className="btn btn-danger" onClick={stopSession} style={{ padding: '10px 24px', borderRadius: '10px', fontWeight: 600, background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440' }}>
              <Square size={16} /> Stop & Log to Journal
            </button>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      {Object.keys(programStats).length > 0 && (
        <div className="timer-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '32px' }}>
          <div className="timer-stat-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-default)' }}>
            <div className="timer-stat-value" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{formatTime(totalHours)}</div>
            <div className="timer-stat-label" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: '4px' }}>Total Time</div>
          </div>
          <div className="timer-stat-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-default)' }}>
            <div className="timer-stat-value" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{sessions.length}</div>
            <div className="timer-stat-label" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: '4px' }}>Total Sessions</div>
          </div>
          <div className="timer-stat-card" style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '14px', border: '1px solid var(--border-default)' }}>
            <div className="timer-stat-value" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{Object.keys(programStats).length}</div>
            <div className="timer-stat-label" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: '4px' }}>Programs</div>
          </div>
        </div>
      )}

      {/* Per-Program Breakdown */}
      {Object.keys(programStats).length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <label className="tool-label" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>PROGRAM BREAKDOWN</label>
          <div className="timer-program-list" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(programStats)
              .sort((a, b) => b[1].totalSeconds - a[1].totalSeconds)
              .map(([name, stats]) => {
                const pct = totalHours > 0 ? Math.round((stats.totalSeconds / totalHours) * 100) : 0;
                return (
                  <div key={name} className="timer-program-row" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-default)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div className="timer-program-info" onClick={() => !activeProgram && startFromHistory(name)} style={{ flex: '0 0 200px' }}>
                      <span className="timer-program-name" style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stats.sessions} session{stats.sessions > 1 ? 's' : ''}</span>
                    </div>
                    <div className="timer-program-bar-container" onClick={() => !activeProgram && startFromHistory(name)} style={{ flex: 1, margin: '0 24px', height: '6px', background: 'var(--bg-deep)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div className="timer-program-bar" style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #10B981, #059669)', borderRadius: '3px' }} />
                    </div>
                    <span className="timer-program-time" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', width: '80px', textAlign: 'right' }}>{formatTime(stats.totalSeconds)}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); resetProgram(name); }}
                      title="Reset all sessions for this program"
                      style={{ color: '#EF4444', marginLeft: '16px', padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7 }}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Session History */}
      {sessions.length > 0 && (
        <div style={{ marginTop: '32px', paddingBottom: '32px' }}>
          <label className="tool-label" style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>SESSION HISTORY</label>
          <div className="timer-history" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...sessions].reverse().map(s => (
              <div key={s.id} className="timer-history-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-default)' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{s.program}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>
                    {new Date(s.date).toLocaleDateString()} at {new Date(s.date).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {editingId === s.id ? (
                    <>
                      <input type="number" value={editHours} onChange={(e) => setEditHours(e.target.value)} min="0" style={{ width: '50px', padding: '4px 6px', fontSize: '13px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)' }} placeholder="h" />
                      <span style={{ color: 'var(--text-muted)' }}>h</span>
                      <input type="number" value={editMinutes} onChange={(e) => setEditMinutes(e.target.value)} min="0" max="59" style={{ width: '50px', padding: '4px 6px', fontSize: '13px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)' }} placeholder="m" />
                      <span style={{ color: 'var(--text-muted)' }}>m</span>
                      <button onClick={() => saveEditSession(s.id)} style={{ padding: '6px', background: 'transparent', border: 'none', color: '#10B981', cursor: 'pointer' }}>
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#10B981', fontWeight: 700 }}>
                        {formatTime(s.duration)}
                      </span>
                      <button onClick={() => startEditSession(s)} title="Edit time" style={{ padding: '6px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '8px' }}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => deleteSession(s.id)} style={{ padding: '6px', background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: 0.7 }}>
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
