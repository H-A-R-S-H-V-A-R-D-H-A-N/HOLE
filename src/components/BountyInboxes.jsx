import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, Copy, CheckCircle2, ExternalLink, Inbox } from 'lucide-react';
import '../styles/BountyInboxes.css';

const PLATFORMS = [
  { id: 'hackerone', name: 'HackerOne', suffix: '@wearehackerone.com', color: '#fff' },
  { id: 'bugcrowd', name: 'Bugcrowd', suffix: '@bugcrowdninja.com', color: '#F97316' },
  { id: 'intigriti', name: 'Intigriti', suffix: '@intigriti.me', color: '#8B5CF6' },
  { id: 'yeswehack', name: 'YesWeHack', suffix: '@yeswehack.ninja', color: '#10B981' }
];

const EMAIL_PROVIDERS = [
  { id: 'gmail', name: 'Gmail' },
  { id: 'proton', name: 'ProtonMail' }
];

export default function BountyInboxes() {
  const [relays, setRelays] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hole_bounty_relays')) || {};
    } catch {
      return {};
    }
  });
  
  const [activeProvider, setActiveProvider] = useState(() => {
    return localStorage.getItem('hole_bounty_provider') || 'gmail';
  });

  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    localStorage.setItem('hole_bounty_relays', JSON.stringify(relays));
  }, [relays]);

  useEffect(() => {
    localStorage.setItem('hole_bounty_provider', activeProvider);
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

  const openInbox = (suffix) => {
    let url = '';
    if (activeProvider === 'gmail') {
      url = `https://mail.google.com/mail/u/0/#search/to%3A${encodeURIComponent(suffix)}`;
    } else if (activeProvider === 'proton') {
      url = `https://mail.proton.me/u/0/all-mail#keyword=${encodeURIComponent(suffix)}`;
    }

    if (url) {
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  return (
    <div className="bi-root page-enter">
      <div className="bi-container">
        
        <div className="bi-header-center">
          <div className="bi-icon-wrapper">
            <Inbox size={32} color="#a78bfa" />
          </div>
          <h1 className="bi-title">Bounty Email Hub</h1>
          <p className="bi-subtitle">Manage your platform relays and instantly filter your default browser inbox.</p>
        </div>

        <div className="bi-security-banner">
          <ShieldCheck size={20} className="bi-security-icon" />
          <div className="bi-security-text">
            <strong>System Browser Integration</strong><br/>
            Clicking a platform opens your actual default browser (Chrome/Firefox). HOLE does not load any webviews or handle authentication, guaranteeing maximum speed and privacy.
          </div>
        </div>

        <div className="bi-grid">
          {/* Provider Selection */}
          <div className="bi-panel">
            <div className="bi-section-title">1. Select Email Provider</div>
            <div className="bi-provider-grid">
              {EMAIL_PROVIDERS.map(provider => (
                <div 
                  key={provider.id} 
                  className={`bi-provider-btn ${activeProvider === provider.id ? 'active' : ''}`}
                  onClick={() => setActiveProvider(provider.id)}
                >
                  <Mail size={18} />
                  <span className="bi-provider-name">{provider.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Relays */}
          <div className="bi-panel" style={{ gridColumn: 'span 2' }}>
            <div className="bi-section-title">2. Manage & Open Relays</div>
            <div className="bi-relay-list">
              {PLATFORMS.map(platform => (
                <div key={platform.id} className="bi-relay-card">
                  
                  <div className="bi-relay-info" onClick={() => openInbox(platform.suffix)} style={{ cursor: 'pointer' }} title={`Open ${activeProvider} filtered by ${platform.suffix}`}>
                    <div className="bi-relay-logo" style={{ color: platform.color }}>
                      {platform.name.charAt(0)}
                    </div>
                    <div>
                      <div className="bi-relay-name">{platform.name}</div>
                      <div className="bi-relay-action">
                        Open in {activeProvider === 'gmail' ? 'Gmail' : 'ProtonMail'} <ExternalLink size={10} />
                      </div>
                    </div>
                  </div>

                  <div className="bi-relay-controls">
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
          </div>
        </div>

      </div>
    </div>
  );
}
