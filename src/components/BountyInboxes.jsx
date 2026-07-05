import React, { useState, useEffect, useRef } from 'react';
import { Mail, ShieldCheck, Copy, CheckCircle2, Search, ArrowLeft, ArrowRight, RotateCw, ExternalLink, Inbox } from 'lucide-react';
import '../styles/BountyInboxes.css';

const PLATFORMS = [
  { id: 'hackerone', name: 'HackerOne', suffix: '@wearehackerone.com', color: '#fff' },
  { id: 'bugcrowd', name: 'Bugcrowd', suffix: '@bugcrowdninja.com', color: '#F97316' },
  { id: 'intigriti', name: 'Intigriti', suffix: '@intigriti.me', color: '#8B5CF6' },
  { id: 'yeswehack', name: 'YesWeHack', suffix: '@yeswehack.com', color: '#10B981' }
];

const EMAIL_PROVIDERS = [
  { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com/mail/u/0/' },
  { id: 'proton', name: 'ProtonMail', url: 'https://mail.proton.me/' },
  { id: 'outlook', name: 'Outlook', url: 'https://outlook.live.com/mail/0/' },
];

export default function BountyInboxes() {
  const [relays, setRelays] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hole_bounty_relays')) || {};
    } catch {
      return {};
    }
  });

  const [copiedId, setCopiedId] = useState(null);
  const [activeProvider, setActiveProvider] = useState(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const webviewRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('hole_bounty_relays', JSON.stringify(relays));
  }, [relays]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const handleDidStartLoading = () => setLoading(true);
    const handleDidStopLoading = () => setLoading(false);
    const handleDidNavigate = (e) => setCurrentUrl(e.url);
    const handleDidNavigateInPage = (e) => setCurrentUrl(e.url);

    wv.addEventListener('did-start-loading', handleDidStartLoading);
    wv.addEventListener('did-stop-loading', handleDidStopLoading);
    wv.addEventListener('did-navigate', handleDidNavigate);
    wv.addEventListener('did-navigate-in-page', handleDidNavigateInPage);

    return () => {
      wv.removeEventListener('did-start-loading', handleDidStartLoading);
      wv.removeEventListener('did-stop-loading', handleDidStopLoading);
      wv.removeEventListener('did-navigate', handleDidNavigate);
      wv.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
    };
  }, [activeProvider]);

  const handleRelayChange = (id, value) => {
    setRelays(prev => ({ ...prev, [id]: value }));
  };

  const copyToClipboard = (id, suffix) => {
    const value = relays[id];
    if (!value) return;
    
    // If they typed the full email, copy as is. If just username, append suffix.
    const toCopy = value.includes('@') ? value : `${value}${suffix}`;
    navigator.clipboard.writeText(toCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadProvider = (provider) => {
    setActiveProvider(provider);
    setCurrentUrl(provider.url);
  };

  const goBack = () => webviewRef.current?.goBack();
  const goForward = () => webviewRef.current?.goForward();
  const reload = () => webviewRef.current?.reload();

  const filterByRelay = (suffix) => {
    if (!activeProvider) return;
    
    if (activeProvider.id === 'gmail') {
      webviewRef.current.loadURL(`https://mail.google.com/mail/u/0/#search/to%3A${encodeURIComponent(suffix)}`);
    } else if (activeProvider.id === 'proton') {
      webviewRef.current.loadURL(`https://mail.proton.me/u/0/all-mail#keyword=${encodeURIComponent(suffix)}`);
    } else {
      alert("Filtering is currently optimized for Gmail and ProtonMail. Please use the provider's native search bar.");
    }
  };

  return (
    <div className="bi-root page-enter">
      {/* ─── Sidebar Settings ─── */}
      <div className="bi-sidebar">
        <div className="bi-header">
          <h1 className="bi-title">Bounty Email Hub</h1>
          <p className="bi-subtitle">Manage your platform relays and read emails without leaving HOLE.</p>
        </div>

        <div className="bi-security-banner">
          <ShieldCheck size={20} className="bi-security-icon" />
          <div className="bi-security-text">
            <strong>100% Zero-Telemetry Webview</strong><br/>
            Your email is loaded directly from the provider in an isolated sandbox. HOLE cannot see, read, or intercept your passwords.
          </div>
        </div>

        <div className="bi-section">
          <div className="bi-section-title">Relay Address Vault</div>
          {PLATFORMS.map(platform => (
            <div key={platform.id} className="bi-relay-card">
              <div className="bi-relay-header">
                <div className="bi-relay-logo" style={{ color: platform.color }}>
                  {platform.name.charAt(0)}
                </div>
                <div className="bi-relay-name">{platform.name}</div>
              </div>
              <div className="bi-relay-input-wrapper">
                <input
                  type="text"
                  className="bi-relay-input"
                  placeholder={`username${platform.suffix}`}
                  value={relays[platform.id] || ''}
                  onChange={(e) => handleRelayChange(platform.id, e.target.value)}
                />
                <button 
                  className="bi-relay-copy" 
                  onClick={() => copyToClipboard(platform.id, platform.suffix)}
                  title="Copy Address"
                >
                  {copiedId === platform.id ? <CheckCircle2 size={16} color="#22c55e" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bi-section">
          <div className="bi-section-title">Open Inbox</div>
          <div className="bi-provider-grid">
            {EMAIL_PROVIDERS.map(provider => (
              <div 
                key={provider.id} 
                className={`bi-provider-btn ${activeProvider?.id === provider.id ? 'active' : ''}`}
                onClick={() => loadProvider(provider)}
              >
                <div className="bi-provider-icon">
                  <Mail size={18} />
                </div>
                <div className="bi-provider-name">{provider.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main Webview ─── */}
      <div className="bi-main">
        {activeProvider ? (
          <>
            <div className="bi-webview-header">
              <div className="bi-webview-controls">
                <button className="bi-nav-btn" onClick={goBack}><ArrowLeft size={16} /></button>
                <button className="bi-nav-btn" onClick={goForward}><ArrowRight size={16} /></button>
                <button className="bi-nav-btn" onClick={reload}><RotateCw size={16} className={loading ? 'tm-spin' : ''} /></button>
              </div>
              
              <div className="bi-url-bar">
                <ShieldCheck size={14} color="#22c55e" />
                <span className="bi-url-text">{currentUrl || activeProvider.url}</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="bi-filter-btn" onClick={() => filterByRelay('wearehackerone.com')}>
                  <Search size={12} /> H1 Filter
                </button>
                <button className="bi-filter-btn" onClick={() => filterByRelay('bugcrowdninja.com')}>
                  <Search size={12} /> BC Filter
                </button>
              </div>
            </div>
            
            <div className="bi-webview-container">
              {loading && (
                <div className="bi-loading-overlay">
                  <RotateCw size={24} className="tm-spin" color="#a78bfa" />
                  <div className="bi-loading-text">Loading {activeProvider.name}...</div>
                </div>
              )}
              {/* Electron webview tag */}
              <webview 
                ref={webviewRef} 
                src={activeProvider.url} 
                allowpopups="true"
                partition="persist:bounty-emails"
              ></webview>
            </div>
          </>
        ) : (
          <div className="bi-welcome-placeholder">
            <div className="bi-welcome-icon">
              <Inbox size={32} />
            </div>
            <h3>Bounty Email Sandbox</h3>
            <p>Select an email provider from the sidebar to load your inbox in a secure, isolated container.</p>
          </div>
        )}
      </div>
    </div>
  );
}
