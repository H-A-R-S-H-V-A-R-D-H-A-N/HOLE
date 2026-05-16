import { useState, useEffect, useRef } from 'react';
import { Shield, Wifi, WifiOff, RefreshCw, Globe, Terminal, Copy, Check, Download, AlertTriangle, Eye, Clock, MapPin, ExternalLink, Settings, ShieldAlert, Search } from 'lucide-react';
import '../styles/Tools.css';

export default function TorMode() {
  const [torStatus, setTorStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [torLog, setTorLog] = useState([]);
  const [currentIP, setCurrentIP] = useState(null);
  const [circuitCount, setCircuitCount] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedProxy, setCopiedProxy] = useState(false);
  const [torInstalled, setTorInstalled] = useState(null);

  // Advanced settings
  const [showSettings, setShowSettings] = useState(false);
  const [autoRotate, setAutoRotate] = useState(0); // minutes, 0 = off
  const [exitCountry, setExitCountry] = useState('any');
  const [bridgeType, setBridgeType] = useState('none');
  const [bridges, setBridges] = useState('');
  const [killSwitch, setKillSwitch] = useState(true);
  const [preferredBrowser, setPreferredBrowser] = useState('auto');
  
  // Onion Discovery
  const [onionUrl, setOnionUrl] = useState('');
  const [onionContent, setOnionContent] = useState('');
  const [onionLoading, setOnionLoading] = useState(false);
  const [globalGhost, setGlobalGhost] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const logEndRef = useRef(null);
  const sessionTimer = useRef(null);
  const rotateTimer = useRef(null);
  const healthTimer = useRef(null);

  const SOCKS5_PROXY = '127.0.0.1:9050';

  useEffect(() => {
    const checkTor = async () => {
      if (!window.electronAPI) { setTorInstalled(false); return; }
      try {
        const result = await window.electronAPI.checkTorInstalled();
        setTorInstalled(result.installed);
      } catch {
        setTorInstalled(false);
      }
    };
    checkTor();
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    const handleTorLog = (data) => {
      if (data.type === 'log') {
        setTorLog(prev => [...prev.slice(-200), { time: new Date().toLocaleTimeString(), msg: data.message }]);
      } else if (data.type === 'status') {
        setTorStatus(data.status);
        if (data.status === 'connected') fetchCurrentIP();
      } else if (data.type === 'ip') {
        setCurrentIP(data.ip);
      }
    };
    window.electronAPI.onTorEvent(handleTorLog);
    return () => window.electronAPI.offTorEvent();
  }, []);

  // Session & Health Timers
  useEffect(() => {
    if (torStatus === 'connected') {
      sessionTimer.current = setInterval(() => setSessionDuration(prev => prev + 1), 1000);
      
      if (killSwitch) {
        healthTimer.current = setInterval(async () => {
          const res = await window.electronAPI.torHealthCheck();
          if (!res.alive) {
            setTorStatus('error');
            setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'KILL-SWITCH ACTIVATED: Tor connection lost!' }]);
            setCurrentIP('DISCONNECTED');
          }
        }, 5000);
      }
    } else {
      if (sessionTimer.current) clearInterval(sessionTimer.current);
      if (healthTimer.current) clearInterval(healthTimer.current);
      if (torStatus === 'disconnected') setSessionDuration(0);
    }
    return () => {
      if (sessionTimer.current) clearInterval(sessionTimer.current);
      if (healthTimer.current) clearInterval(healthTimer.current);
    };
  }, [torStatus, killSwitch]);

  // Auto Rotate Timer
  useEffect(() => {
    if (rotateTimer.current) clearInterval(rotateTimer.current);
    if (torStatus === 'connected' && autoRotate > 0) {
      rotateTimer.current = setInterval(() => {
        newIdentity();
      }, autoRotate * 60 * 1000);
    }
    return () => { if (rotateTimer.current) clearInterval(rotateTimer.current); };
  }, [autoRotate, torStatus]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [torLog]);

  const startTor = async () => {
    setTorStatus('connecting');
    setTorLog([{ time: new Date().toLocaleTimeString(), msg: 'Applying configuration and starting Tor...' }]);
    try {
      const bridgeList = bridges.split('n').filter(b => b.trim().length > 0);
      await window.electronAPI.updateTorConfig({
        exitCountry,
        bridges: bridgeList,
        bridgeType: bridgeType !== 'none' ? bridgeType : null
      });

      const result = await window.electronAPI.startTor();
      if (!result.success) {
        setTorStatus('error');
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Error: ${result.error}` }]);
      }
    } catch (e) {
      setTorStatus('error');
      setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Fatal: ${e.message}` }]);
    }
  };

  const restartTor = async () => {
    if (torStatus === 'disconnected') return;
    setTorStatus('connecting');
    try {
      const bridgeList = bridges.split('n').filter(b => b.trim().length > 0);
      await window.electronAPI.updateTorConfig({
        exitCountry,
        bridges: bridgeList,
        bridgeType: bridgeType !== 'none' ? bridgeType : null
      });
      await window.electronAPI.restartTor();
    } catch (e) {
      setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Restart error: ${e.message}` }]);
    }
  };

  const stopTor = async () => {
    try {
      await window.electronAPI.stopTor();
      setTorStatus('disconnected');
      setCurrentIP(null);
      setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Tor daemon stopped.' }]);
    } catch (e) {
      setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Stop error: ${e.message}` }]);
    }
  };

  const newIdentity = async () => {
    setIsRefreshing(true);
    setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Requesting new identity (new circuit)...' }]);
    try {
      const result = await window.electronAPI.torNewIdentity();
      if (result.success) {
        setCircuitCount(prev => prev + 1);
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'New identity acquired. Circuit rotated.' }]);
        setTimeout(() => fetchCurrentIP(), 3000);
      } else {
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Identity change failed: ${result.error}` }]);
      }
    } catch (e) {
      setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Error: ${e.message}` }]);
    }
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const fetchCurrentIP = async () => {
    try {
      const result = await window.electronAPI.getTorIP();
      if (result.success) {
        setCurrentIP(result.ip);
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Exit node IP: ${result.ip}` }]);
      }
    } catch (e) {
      console.warn('Failed to get Tor IP', e);
    }
  };

  
  const toggleGlobalGhost = async () => {
    if (!globalGhost) {
      if (torStatus !== 'connected') {
        alert('You must connect to Tor first before enabling System-Wide Ghost Mode.');
        return;
      }
      setGlobalGhost(true);
      setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Activating System-Wide Ghost Mode...' }]);
      const res = await window.electronAPI.enableGlobalGhost();
      if (res.success) {
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Global Ghost Mode ACTIVE: All Windows OS traffic routed through Tor.' }]);
      } else {
        setGlobalGhost(false);
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Failed to enable Ghost Mode: ' + res.error }]);
      }
    } else {
      setGlobalGhost(false);
      setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Deactivating System-Wide Ghost Mode...' }]);
      const res = await window.electronAPI.disableGlobalGhost();
      if (res.success) {
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Global Ghost Mode DISABLED: Normal routing restored.' }]);
      } else {
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Failed to disable Ghost Mode (Failsafe triggered): ' + res.error }]);
      }
    }
  };

  const openAnonymousBrowser = async () => {
    if (killSwitch && torStatus !== 'connected') {
      alert('Kill-Switch Active: Tor is not connected. Browser launch blocked to prevent IP leaks.');
      return;
    }
    try {
      const res = await window.electronAPI.openAnonymousBrowser(preferredBrowser);
      if (res.success) {
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Launched anonymous ${res.browser} session via SOCKS5.` }]);
      } else {
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Browser launch failed: ${res.error}` }]);
      }
    } catch (e) {
      setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Browser launch error: ${e.message}` }]);
    }
  };

  const fetchOnion = async () => {
    if (!onionUrl) return;
    if (killSwitch && torStatus !== 'connected') {
      alert('Kill-Switch Active: Tor is not connected.');
      return;
    }
    setOnionLoading(true);
    setOnionContent('Fetching hidden service...nRouting through SOCKS5 proxy...');
    try {
      let target = onionUrl.trim();
      if (!target.startsWith('http')) target = 'http://' + target;
      
      const res = await window.electronAPI.torFetchUrl(target);
      if (res.success) {
        setOnionContent(res.html);
        setTorLog(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Fetched ${res.length} bytes from ${target}` }]);
      } else {
        setOnionContent(`Error fetching ${target}:n${res.error}`);
      }
    } catch (e) {
      setOnionContent(`Critical error: ${e.message}`);
    }
    setOnionLoading(false);
  };

  const copyProxy = () => {
    navigator.clipboard.writeText(`socks5h://${SOCKS5_PROXY}`);
    setCopiedProxy(true);
    setTimeout(() => setCopiedProxy(false), 2000);
  };

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const statusColor = {
    disconnected: '#6B7280',
    connecting: '#F59E0B',
    connected: '#10B981',
    error: '#EF4444',
  };

  const statusLabel = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected & Anonymous',
    error: 'Connection Error (Kill-Switch)',
  };

  if (torInstalled === null) {
    return <div className="tool-page page-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 40px)' }}><div style={{ color: 'var(--text-muted)' }}>Checking for Tor Engine...</div></div>;
  }

  if (!torInstalled) {
    return (
      <div className="tool-page page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 40px)', gap: '24px', padding: '0 40px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: 'linear-gradient(135deg, #EF4444, #DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(239, 68, 68, 0.3)' }}>
          <AlertTriangle size={40} color="#fff" />
        </div>
        <h2 style={{ margin: 0, fontWeight: 800, fontSize: '28px', color: 'var(--text-primary)' }}>Tor Engine Missing</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '15px', textAlign: 'center', maxWidth: '500px', lineHeight: 1.6 }}>
          The bundled Tor binary could not be found. This may happen if your antivirus quarantined it or the app installation is corrupted. Try reinstalling HOLE.
        </p>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}><RefreshCw size={14} /> Re-check</button>
      </div>
    );
  }

  return (
    <div className="tool-page page-enter" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', gap: '24px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: torStatus === 'connected' ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #7C3AED, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: torStatus === 'connected' ? '0 0 25px rgba(16, 185, 129, 0.4)' : '0 0 25px rgba(124, 58, 237, 0.3)', transition: 'all 0.5s ease' }}>
            <Shield size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Tor Engine</h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Elite privacy & censorship bypass</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: showSettings ? '#374151' : 'transparent', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <Settings size={14} /> Settings
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-secondary)', border: `1px solid ${statusColor[torStatus]}40`, borderRadius: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColor[torStatus], boxShadow: `0 0 10px ${statusColor[torStatus]}80`, animation: torStatus === 'connecting' ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: statusColor[torStatus] }}>{statusLabel[torStatus]}</span>
          </div>
        </div>
      </div>

      
      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-default)', paddingBottom: '16px', marginBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          style={{ padding: '8px 16px', background: activeTab === 'dashboard' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-muted)', border: activeTab === 'dashboard' ? '1px solid var(--border-default)' : '1px solid transparent', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          style={{ padding: '8px 16px', background: activeTab === 'logs' ? 'var(--bg-secondary)' : 'transparent', color: activeTab === 'logs' ? 'var(--text-primary)' : 'var(--text-muted)', border: activeTab === 'logs' ? '1px solid var(--border-default)' : '1px solid transparent', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
        >
          Engine Logs {torLog.length > 0 && <span style={{ background: '#374151', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', marginLeft: '6px' }}>{torLog.length}</span>}
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Advanced Settings Panel */}
      {showSettings && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.2s' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="#A78BFA" /> Advanced Configurations
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Magic IP Rotator</label>
              <select value={autoRotate} onChange={(e) => setAutoRotate(Number(e.target.value))} style={{ width: '100%', padding: '10px', background: '#000', border: '1px solid var(--border-default)', borderRadius: '8px', color: '#fff' }}>
                <option value={0}>Disabled</option>
                <option value={5}>Rotate every 5 minutes</option>
                <option value={10}>Rotate every 10 minutes</option>
                <option value={30}>Rotate every 30 minutes</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Exit Node Country</label>
              <select value={exitCountry} onChange={(e) => { setExitCountry(e.target.value); if (torStatus === 'connected') restartTor(); }} style={{ width: '100%', padding: '10px', background: '#000', border: '1px solid var(--border-default)', borderRadius: '8px', color: '#fff' }}>
                <option value="any">Any (Random)</option>
                <option value="us">United States (us)</option>
                <option value="gb">United Kingdom (gb)</option>
                <option value="de">Germany (de)</option>
                <option value="ru">Russia (ru)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Censorship Bypass (Bridges)</label>
              <select value={bridgeType} onChange={(e) => { setBridgeType(e.target.value); if (torStatus === 'connected') restartTor(); }} style={{ width: '100%', padding: '10px', background: '#000', border: '1px solid var(--border-default)', borderRadius: '8px', color: '#fff' }}>
                <option value="none">Direct Connection (No Bridge)</option>
                <option value="obfs4">obfs4 (Requires custom bridges)</option>
                <option value="snowflake">Snowflake (Built-in proxy)</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" id="killSwitch" checked={killSwitch} onChange={(e) => setKillSwitch(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              <label htmlFor="killSwitch" style={{ fontSize: '14px', fontWeight: 700, color: killSwitch ? '#10B981' : 'var(--text-muted)', cursor: 'pointer' }}>Network Kill-Switch</label>
            </div>
          </div>
          {bridgeType === 'obfs4' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Custom Bridge Addresses (Paste from bridges.torproject.org)</label>
              <textarea value={bridges} onChange={(e) => setBridges(e.target.value)} placeholder="obfs4 192.0.2.1:1234..." style={{ width: '100%', height: '80px', padding: '10px', background: '#000', border: '1px solid var(--border-default)', borderRadius: '8px', color: '#10B981', fontFamily: 'var(--font-mono)' }} />
              <button onClick={restartTor} style={{ marginTop: '8px', padding: '6px 12px', background: '#374151', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Apply Bridges & Restart</button>
            </div>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <MapPin size={16} color="#A78BFA" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exit Node IP</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: currentIP ? '#10B981' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {currentIP || '—'}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Globe size={16} color="#60A5FA" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SOCKS5 Proxy</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: torStatus === 'connected' ? '#10B981' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {SOCKS5_PROXY}
            </span>
            <button onClick={copyProxy} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: copiedProxy ? '#10B981' : 'var(--text-muted)' }}>
              {copiedProxy ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Clock size={16} color="#F59E0B" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Session Time</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatDuration(sessionDuration)}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <RefreshCw size={16} color="#10B981" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Circuits Rotated</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {circuitCount} {autoRotate > 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>(Auto: {autoRotate}m)</span>}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {torStatus === 'disconnected' || torStatus === 'error' ? (
          <button onClick={startTor} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }}>
            <Wifi size={18} /> Start Tor Engine
          </button>
        ) : torStatus === 'connecting' ? (
          <button disabled style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: '#F59E0B30', color: '#F59E0B', border: '1px solid #F59E0B40', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'not-allowed' }}>
            <RefreshCw size={18} className="spin-animation" /> Bootstrapping...
          </button>
        ) : (
          <>
            <button onClick={stopTor} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              <WifiOff size={18} /> Stop Tor
            </button>
            <button onClick={newIdentity} disabled={isRefreshing} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: '#A78BFA20', color: '#A78BFA', border: '1px solid #A78BFA40', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: isRefreshing ? 'not-allowed' : 'pointer', opacity: isRefreshing ? 0.6 : 1 }}>
              <RefreshCw size={18} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} /> New Identity
            </button>
            <div style={{ display: 'flex', alignItems: 'center', background: '#60A5FA10', border: '1px solid #60A5FA30', borderRadius: '12px', overflow: 'hidden' }}>
              <button onClick={openAnonymousBrowser} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'transparent', color: '#60A5FA', border: 'none', borderRight: '1px solid #60A5FA30', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                <ExternalLink size={18} /> Open Anonymous Browser
              </button>
              <select value={preferredBrowser} onChange={(e) => setPreferredBrowser(e.target.value)} style={{ background: 'transparent', color: '#60A5FA', border: 'none', padding: '12px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="auto" style={{background:'#000',color:'#fff'}}>Auto-detect</option>
                <option value="chrome" style={{background:'#000',color:'#fff'}}>Chrome</option>
                <option value="firefox" style={{background:'#000',color:'#fff'}}>Firefox</option>
                <option value="edge" style={{background:'#000',color:'#fff'}}>Edge</option>
                <option value="brave" style={{background:'#000',color:'#fff'}}>Brave</option>
                <option value="opera" style={{background:'#000',color:'#fff'}}>Opera</option>
              </select>
            </div>
            <button onClick={fetchCurrentIP} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
              <Eye size={18} /> Check IP
            </button>
          </>
        )}
      </div>

      {/* Cloudflare / Captcha Notice */}
      <div style={{ background: '#F59E0B15', border: '1px solid #F59E0B40', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '-8px' }}>
        <AlertTriangle size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: '#F59E0B' }}>OPSEC Tip: Avoiding Infinite Captchas</h4>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Cloudflare and Google aggressively block Tor Exit Nodes because they are shared by thousands of users simultaneously. If you are stuck in a captcha loop, <strong>it is not a bug; it is the target firewall rejecting your Tor IP.</strong> We highly recommend using the <strong style={{color: '#fff'}}>DuckDuckGo Onion Engine</strong> (duckduckgogg42xjoc72x3sio.onion) for recon, as they natively support Tor traffic without captchas. If a target is blocking you, use the <strong>New Identity</strong> button to rotate to a fresh IP.
          </p>
        </div>
      </div>

      
      {/* Global Ghost Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', marginTop: '-8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={24} color="#10B981" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
              System-Wide Ghost Mode
              {globalGhost && <span style={{ fontSize: '10px', padding: '2px 6px', background: '#10B981', color: '#000', borderRadius: '4px', fontWeight: 900 }}>ACTIVE</span>}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: '600px' }}>
              Force the entire Windows Operating System (including external cmd.exe, Chrome, Spotify) to route through the active Tor connection. Use with extreme caution.
            </p>
            <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #EF4444', borderRadius: '4px', fontSize: '11px', color: '#FCA5A5' }}>
              <strong>CRASH WARNING:</strong> If HOLE closes unexpectedly while Ghost Mode is ACTIVE, your Windows internet will break ("Proxy server refusing connections"). 
              To fix it, go to Windows Settings -&gt; Proxy -&gt; Turn OFF "Use a proxy server".
            </div>
          </div>
        </div>
        <button 
          onClick={toggleGlobalGhost}
          disabled={torStatus !== 'connected'}
          style={{ 
            padding: '12px 24px', 
            borderRadius: '12px', 
            fontSize: '14px', 
            fontWeight: 800, 
            cursor: torStatus === 'connected' ? 'pointer' : 'not-allowed',
            background: globalGhost ? '#EF4444' : '#10B981',
            color: '#fff',
            border: 'none',
            boxShadow: globalGhost ? '0 0 20px rgba(239, 68, 68, 0.4)' : (torStatus === 'connected' ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none'),
            opacity: torStatus === 'connected' ? 1 : 0.5,
            transition: 'all 0.3s ease'
          }}
        >
          {globalGhost ? 'Deactivate System Proxy' : 'Hijack System Proxy'}
        </button>
      </div>

        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Terminal size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Engine Log</span>
          </div>
          <div style={{ flex: 1, background: '#000', borderRadius: '12px', border: '1px solid var(--border-default)', padding: '16px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.8 }}>
            {torLog.length === 0 ? (
              <div style={{ color: '#4B5563' }}>Tor daemon logs will appear here when started...</div>
            ) : (
              torLog.map((entry, i) => (
                <div key={i} style={{ color: entry.msg.startsWith('Error') || entry.msg.startsWith('Fatal') || entry.msg.includes('KILL-SWITCH') ? '#EF4444' : entry.msg.includes('Exit node') || entry.msg.includes('Connected') || entry.msg.includes('acquired') ? '#10B981' : '#9CA3AF' }}>
                  <span style={{ color: '#6B728080', marginRight: '8px' }}>[{entry.time}]</span>
                  {entry.msg}
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
