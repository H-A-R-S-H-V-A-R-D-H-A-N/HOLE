import { useState, useEffect, useRef } from 'react';
import { Activity, Copy, CheckCircle2, Server, Globe, Zap, Mail, ChevronRight, Hash, Eye, Trash2 } from 'lucide-react';
import '../styles/SonarCatcher.css';

export default function SonarCatcher() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [interactions, setInteractions] = useState([]);
  const [activeInteraction, setActiveInteraction] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [error, setError] = useState(null);
  const [detailTab, setDetailTab] = useState('request');
  const [mainTab, setMainTab] = useState('pings');

  // Use refs to keep event handlers updated without re-rendering listeners
  const interactionsRef = useRef(interactions);
  useEffect(() => { interactionsRef.current = interactions; }, [interactions]);

  useEffect(() => {
    let removeListener = null;
    
    const initStatus = async () => {
      try {
        if (window.electronAPI && window.electronAPI.sonarStatus) {
          const status = await window.electronAPI.sonarStatus();
          if (status.running) {
            setRunning(true);
            setUrl(status.url);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    initStatus();

    if (window.electronAPI && window.electronAPI.onSonarInteraction) {
      removeListener = window.electronAPI.onSonarInteraction((data) => {
        // Add to top of list
        const newInt = { ...data, id: Date.now() + Math.random() };
        setInteractions([newInt, ...interactionsRef.current]);
      });
    }
    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  const startSonar = async () => {
    if (running) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.electronAPI.sonarStart();
      if (res.success) {
        setUrl(res.url);
        setRunning(true);
        setInteractions([]);
        setActiveInteraction(null);
      } else {
        setError(res.error || 'Failed to start Sonar Engine.');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const stopSonar = async () => {
    if (!running) return;
    try {
      await window.electronAPI.sonarStop();
      setRunning(false);
    } catch (e) {
      console.error(e);
    }
  };

  const copyUrl = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyPayloadTemplate = (template) => {
    const payload = template.replace('{{URL}}', url);
    navigator.clipboard.writeText(payload);
  };

  const getProtocolIcon = (proto) => {
    const p = (proto || '').toLowerCase();
    if (p.includes('http')) return <Globe size={14} color="#38BDF8" />;
    if (p.includes('dns')) return <Server size={14} color="#A78BFA" />;
    if (p.includes('smtp')) return <Mail size={14} color="#F472B6" />;
    return <Zap size={14} color="#FBBF24" />;
  };

  const copyRawRequest = () => {
    if (activeInteraction && activeInteraction.raw_request) {
      navigator.clipboard.writeText(activeInteraction.raw_request);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    }
  };

  return (
    <div className="sonar-root">
      <div className="sonar-header">
        <div className="sonar-title-area">
          <div className="sonar-icon-wrap">
            <Activity className={running ? 'sonar-pulse-icon active' : 'sonar-pulse-icon'} size={24} color="#A78BFA" />
          </div>
          <div>
            <h1>Sonar <span>OOB Catcher</span></h1>
            <p>Catch blind interactions (DNS, HTTP, SMTP) automatically using the secure Interactsh network.</p>
          </div>
        </div>
        
        <div className="sonar-main-tabs">
          <button 
            className={`sonar-main-tab ${mainTab === 'pings' ? 'active' : ''}`}
            onClick={() => setMainTab('pings')}
          >
            <Activity size={14} /> Captured Pings {interactions.length > 0 && `(${interactions.length})`}
          </button>
          <button 
            className={`sonar-main-tab ${mainTab === 'details' ? 'active' : ''}`}
            onClick={() => setMainTab('details')}
            disabled={!activeInteraction}
          >
            <Eye size={14} /> Interaction Details
          </button>
        </div>

        <div className="sonar-controls">
          {running ? (
            <button className="sonar-btn stop" onClick={stopSonar}>Stop Sonar Engine</button>
          ) : (
            <button className="sonar-btn start" onClick={startSonar} disabled={loading}>
              {loading ? 'Booting Engine...' : 'Start Sonar Engine'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="sonar-error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="sonar-layout">
        {mainTab === 'pings' ? (
        <div className="sonar-stream-panel" style={{ width: '100%', minWidth: '100%', borderRight: 'none' }}>
          <div className="sonar-payload-card">
            <div className="sonar-payload-label">Your Unique Payload URL</div>
            <div className="sonar-payload-box" onClick={copyUrl} style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span className={url ? 'active' : 'inactive'} style={{ paddingRight: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {url || 'Waiting for engine to start...'}
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); copyUrl(); }}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: copiedUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(167, 139, 250, 0.2)',
                  border: copiedUrl ? '1px solid #10B981' : '1px solid #a78bfa',
                  color: copiedUrl ? '#10B981' : '#c4b5fd',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                {copiedUrl ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copiedUrl ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          </div>

          <div className="sonar-list-header">
            <h3>Captured Interactions</h3>
            <span className="sonar-badge">{interactions.length} Pings</span>
          </div>

          <div className="sonar-list-container">
            {interactions.length === 0 ? (
              <div className="sonar-empty-state">
                <Activity size={48} />
                <div className="empty-title">{running ? 'Listening for pings...' : 'Engine offline'}</div>
                <div className="empty-sub">
                  {running ? 'Fire your payload at a target to see interactions appear here instantly.' : 'Click "Start Sonar Engine" to generate a payload.'}
                </div>
              </div>
            ) : (
              interactions.map((int, i) => (
                <div 
                  key={int.id} 
                  className={`sonar-list-item ${activeInteraction?.id === int.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveInteraction(int);
                    setDetailTab('request');
                    setMainTab('details');
                  }}
                >
                  <div className="sonar-item-proto">{getProtocolIcon(int.protocol)} {int.protocol.toUpperCase()}</div>
                  <div className="sonar-item-meta">
                    <span className="sonar-item-ip">{int.remote_address}</span>
                    <span className="sonar-item-time">{new Date(int.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        ) : (
        <div className="sonar-detail-panel">
          {activeInteraction ? (
            <div className="sonar-detail-content">
              <div className="sonar-detail-header">
                <h2>Interaction Details</h2>
                <div className="sonar-detail-badges">
                  <span className="sonar-badge proto">{activeInteraction.protocol.toUpperCase()}</span>
                  {activeInteraction.query_type && <span className="sonar-badge qtype">Type: {activeInteraction.query_type}</span>}
                </div>
              </div>

              <div className="sonar-detail-grid">
                <div className="sonar-meta-box">
                  <span className="meta-label"><Globe size={12}/> Remote IP</span>
                  <span className="meta-value">{activeInteraction.remote_address}</span>
                </div>
                <div className="sonar-meta-box">
                  <span className="meta-label"><Activity size={12}/> Protocol</span>
                  <span className="meta-value">{activeInteraction.protocol.toUpperCase()}</span>
                </div>
                <div className="sonar-meta-box">
                  <span className="meta-label"><Hash size={12}/> Timestamp</span>
                  <span className="meta-value">{new Date(activeInteraction.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="sonar-raw-section">
                <div className="sonar-raw-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0', display: 'flex', justifyContent: 'space-between' }}>
                  <div className="sonar-tabs" style={{ display: 'flex', gap: '20px' }}>
                    <div 
                      className={`sonar-tab ${detailTab === 'request' ? 'active' : ''}`}
                      onClick={() => setDetailTab('request')}
                    >
                      <Eye size={14} /> Request
                    </div>
                    {activeInteraction.raw_response && (
                      <div 
                        className={`sonar-tab ${detailTab === 'response' ? 'active' : ''}`}
                        onClick={() => setDetailTab('response')}
                      >
                        <Server size={14} /> Response
                      </div>
                    )}
                  </div>
                  <button className="sonar-copy-btn" onClick={copyRawRequest} title="Copy Raw Data" style={{ marginBottom: '8px' }}>
                    {copiedRaw ? <CheckCircle2 size={14} color="#10B981" /> : <Copy size={14} />} 
                    {copiedRaw ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="sonar-raw-code">
                  <code>{detailTab === 'request' ? (activeInteraction.raw_request || 'No raw request data available.') : (activeInteraction.raw_response || 'No raw response data available.')}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="sonar-detail-empty">
              <Zap size={64} />
              <h3>No Interaction Selected</h3>
              <p>Select a ping from the left panel to view full HTTP headers, DNS query details, and raw payloads.</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
