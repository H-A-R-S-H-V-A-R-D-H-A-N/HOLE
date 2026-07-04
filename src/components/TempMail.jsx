import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, RefreshCw, Copy, CheckCircle2, Inbox, Trash2, ArrowLeft, ExternalLink, Sparkles, Plus, Heart, X } from 'lucide-react';
import '../styles/TempMail.css';

const API_BASE = 'https://api.mail.tm';

export default function TempMail() {
  const [accounts, setAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kroma_temp_mail_accounts')) || []; } catch { return []; }
  });
  const [activeIdx, setActiveIdx] = useState(() => {
    try { return parseInt(localStorage.getItem('kroma_temp_mail_active') || '0'); } catch { return 0; }
  });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [messageDetails, setMessageDetails] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const pollRef = useRef(null);

  const account = accounts[activeIdx] || null;

  const saveAccounts = useCallback((accs, idx) => {
    localStorage.setItem('kroma_temp_mail_accounts', JSON.stringify(accs));
    localStorage.setItem('kroma_temp_mail_active', String(idx ?? 0));
  }, []);

  // Poll for messages
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!account?.token) return;

    fetchMessages(true);
    pollRef.current = setInterval(() => fetchMessages(false), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [account?.token]);

  const generateEmail = async () => {
    setGenerating(true);
    try {
      const domainsRes = await fetch(`${API_BASE}/domains?page=1`);
      const domainsData = await domainsRes.json();
      const members = domainsData['hydra:member'];
      if (!members?.length) throw new Error('No domains available');

      const domain = members[0].domain;
      const address = Math.random().toString(36).substring(2, 12) + '@' + domain;
      const password = Math.random().toString(36).substring(2) + 'Kx1!';

      const accRes = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });
      if (!accRes.ok) throw new Error('Account creation failed');
      const accData = await accRes.json();

      const tokenRes = await fetch(`${API_BASE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });
      const tokenData = await tokenRes.json();

      const newAcc = { address, password, token: tokenData.token, id: accData.id };
      const newAccounts = [...accounts, newAcc];
      const newIdx = newAccounts.length - 1;
      setAccounts(newAccounts);
      setActiveIdx(newIdx);
      setMessages([]);
      setActiveMessage(null);
      saveAccounts(newAccounts, newIdx);
    } catch (e) {
      console.error('Failed to generate email:', e);
    }
    setGenerating(false);
  };

  const fetchMessages = async (showLoader = false) => {
    if (!account?.token) return;
    if (showLoader) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        headers: { 'Authorization': `Bearer ${account.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data['hydra:member'] || []);
      }
    } catch (e) { console.error('Fetch messages error:', e); }
    if (showLoader) setLoading(false);
  };

  const openMessage = async (msg) => {
    setActiveMessage(msg);
    setLoadingMessage(true);
    setMessageDetails(null);
    try {
      const res = await fetch(`${API_BASE}/messages/${msg.id}`, {
        headers: { 'Authorization': `Bearer ${account.token}` }
      });
      if (res.ok) setMessageDetails(await res.json());
    } catch (e) { console.error('Read message error:', e); }
    setLoadingMessage(false);
  };

  const copyToClipboard = () => {
    if (!account?.address) return;
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const switchAccount = (idx) => {
    setActiveIdx(idx);
    setMessages([]);
    setActiveMessage(null);
    localStorage.setItem('kroma_temp_mail_active', String(idx));
  };

  const burnAccount = async () => {
    if (!account) return;
    try {
      await fetch(`${API_BASE}/accounts/${account.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${account.token}` }
      });
    } catch (e) { /* ignore */ }

    const newAccounts = accounts.filter((_, i) => i !== activeIdx);
    const newIdx = Math.max(0, activeIdx - 1);
    setAccounts(newAccounts);
    setActiveIdx(newAccounts.length ? newIdx : 0);
    setMessages([]);
    setActiveMessage(null);
    saveAccounts(newAccounts, newAccounts.length ? newIdx : 0);
  };

  const openSupport = () => {
    const url = 'https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE-PRO/discussions';
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    else window.open(url, '_blank');
  };

  // ─── Welcome screen (no accounts yet) ───
  if (!accounts.length) {
    return (
      <div className="tm-welcome">
        <div className="tm-welcome-inner">
          <div className="tm-welcome-icon">
            <Mail size={36} color="#a78bfa" />
          </div>
          <h2>Ephemeral Inbox</h2>
          <p>Generate disposable email addresses for testing registration flows, password resets, and blind interactions — all without leaving your workstation.</p>
          <button className="tm-gen-btn" onClick={generateEmail} disabled={generating}>
            {generating ? <RefreshCw size={18} className="tm-spin" /> : <Sparkles size={18} />}
            {generating ? 'Creating...' : 'Generate Address'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main UI ───
  return (
    <div className="tm-root">
      {/* ─── Left: Inbox Panel ─── */}
      <div className="tm-sidebar">
        <div className="tm-email-widget">
          <div className="tm-label">Accounts</div>

          {/* Account Switcher */}
          <div className="tm-accounts-bar">
            {accounts.map((acc, i) => (
              <div key={i} className={`tm-account-pill ${i === activeIdx ? 'active' : ''}`} onClick={() => switchAccount(i)} title={acc.address}>
                {acc.address.split('@')[0]}
              </div>
            ))}
            <button className="tm-add-pill" onClick={generateEmail} disabled={generating} title="New address">
              {generating ? <RefreshCw size={13} className="tm-spin" /> : <Plus size={13} />}
            </button>
          </div>

          {/* Active email display */}
          <div className="tm-email-box" onClick={copyToClipboard}>
            <span className="tm-email-text">{account?.address}</span>
            {copied ? <CheckCircle2 size={15} color="#10B981" /> : <Copy size={15} color="rgba(255,255,255,0.3)" />}
          </div>

          <div className="tm-actions">
            <button className="tm-action-btn refresh" onClick={() => fetchMessages(true)}>
              <RefreshCw size={13} className={loading ? 'tm-spin' : ''} /> Refresh
            </button>
            <button className="tm-action-btn burn" onClick={burnAccount}>
              <Trash2 size={13} /> Burn
            </button>
          </div>
        </div>

        {/* Message List */}
        <div className="tm-messages">
          {messages.length === 0 ? (
            <div className="tm-empty">
              <Inbox size={44} />
              <div className="tm-empty-text">Inbox empty</div>
              <div className="tm-empty-sub">Waiting for emails...</div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`tm-msg-card ${activeMessage?.id === msg.id ? 'active' : ''}`} onClick={() => openMessage(msg)}>
                <div className="tm-msg-header">
                  <span className="tm-msg-from">{msg.from?.name || msg.from?.address || 'Unknown'}</span>
                  <span className="tm-msg-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="tm-msg-subject">{msg.subject || 'No Subject'}</div>
              </div>
            ))
          )}
        </div>

        {/* Support */}
        <div className="tm-support" onClick={openSupport}>
          <Heart size={13} color="rgba(255,255,255,0.25)" />
          <span>Community & Support</span>
        </div>
      </div>

      {/* ─── Right: Email Reader ─── */}
      <div className="tm-main">
        {activeMessage ? (
          <div className="tm-reader">
            <div className="tm-reader-header">
              <button className="tm-back-btn" onClick={() => setActiveMessage(null)}>
                <ArrowLeft size={15} /> Back
              </button>
              <h1 className="tm-reader-title">{activeMessage.subject || 'No Subject'}</h1>
              <div className="tm-sender-row">
                <div className="tm-sender-avatar">
                  {(activeMessage.from?.name || activeMessage.from?.address || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="tm-sender-name">{activeMessage.from?.name ? `${activeMessage.from.name} <${activeMessage.from.address}>` : activeMessage.from?.address}</div>
                  <div className="tm-sender-date">{new Date(activeMessage.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="tm-reader-body">
              {loadingMessage ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                  <RefreshCw className="tm-spin" size={24} color="rgba(255,255,255,0.15)" />
                </div>
              ) : messageDetails ? (
                <div className="tm-email-content">
                  {messageDetails.html?.length ? (
                    <iframe title="Email" srcDoc={messageDetails.html[0]} sandbox="allow-same-origin allow-popups" />
                  ) : (
                    <div className="text-body">{messageDetails.text || 'Empty message.'}</div>
                  )}
                  {messageDetails.attachments?.length > 0 && (
                    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', marginBottom: 10 }}>Attachments</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {messageDetails.attachments.map((att, i) => (
                          <a key={i} href={`${API_BASE}${att.downloadUrl}`} target="_blank" rel="noreferrer" style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.04)', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit' }}>
                            <ExternalLink size={12} /> {att.filename}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40 }}>Failed to load message.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="tm-placeholder">
            <Mail size={120} />
          </div>
        )}
      </div>
    </div>
  );
}
