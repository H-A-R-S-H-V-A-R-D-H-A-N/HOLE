import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, RefreshCw, Copy, CheckCircle2, Inbox, Trash2, ArrowLeft, ExternalLink, Sparkles, Plus, Heart } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import '../styles/TempMail.css';

// ─── Multi-Provider Fallback System ───
const PROVIDERS = [
  {
    name: 'mail.tm',
    base: 'https://api.mail.tm',
    type: 'mailtm',
  },
  {
    name: 'temp-mail.io',
    base: 'https://api.internal.temp-mail.io/api/v3',
    type: 'tempmailio',
  },
];

async function tryProviders(fn) {
  for (const provider of PROVIDERS) {
    try {
      const result = await fn(provider);
      if (result) return { ...result, providerName: provider.name };
    } catch (e) { console.warn(`[TempMail] ${provider.name} failed:`, e.message); }
  }
  throw new Error('All providers failed');
}

// ─── Provider-specific API helpers ───
async function generateWithProvider(provider) {
  if (provider.type === 'mailtm') {
    const domRes = await fetch(`${provider.base}/domains?page=1`);
    if (!domRes.ok) return null;
    const domData = await domRes.json();
    const members = domData['hydra:member'];
    if (!members?.length) return null;

    const domain = members[0].domain;
    const address = 'hole-' + Math.random().toString(36).substring(2, 8) + '@' + domain;
    const password = Math.random().toString(36).substring(2) + 'Hx1!';

    const accRes = await fetch(`${provider.base}/accounts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });
    if (!accRes.ok) return null;
    const accData = await accRes.json();

    const tokRes = await fetch(`${provider.base}/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, password })
    });
    if (!tokRes.ok) return null;
    const tokData = await tokRes.json();

    return { address, token: tokData.token, id: accData.id, password, providerType: 'mailtm', providerBase: provider.base };
  }

  if (provider.type === 'tempmailio') {
    const domRes = await fetch(`${provider.base}/domains`);
    if (!domRes.ok) return null;
    const domData = await domRes.json();
    const domain = domData.domains?.[0]?.name;
    if (!domain) return null;

    const name = 'hole' + Math.random().toString(36).substring(2, 8);
    const res = await fetch(`${provider.base}/email/new`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, domain })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { address: data.email, token: data.token, id: data.token, providerType: 'tempmailio', providerBase: provider.base };
  }

  return null;
}

async function fetchMessagesFromProvider(acc) {
  if (acc.providerType === 'mailtm') {
    let res = await fetch(`${acc.providerBase}/messages`, {
      headers: { 'Authorization': `Bearer ${acc.token}` }
    });

    if (res.status === 401 && acc.password) {
      // Token expired, re-authenticate
      const tokRes = await fetch(`${acc.providerBase}/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: acc.address, password: acc.password })
      });
      if (tokRes.ok) {
        const tokData = await tokRes.json();
        acc.token = tokData.token;
        try {
          const accs = JSON.parse(localStorage.getItem('kroma_temp_mail_accounts')) || [];
          const updatedAccs = accs.map(a => a.id === acc.id ? { ...a, token: tokData.token } : a);
          localStorage.setItem('kroma_temp_mail_accounts', JSON.stringify(updatedAccs));
        } catch {}
        res = await fetch(`${acc.providerBase}/messages`, {
          headers: { 'Authorization': `Bearer ${acc.token}` }
        });
      }
    }

    if (!res.ok) throw new Error('Failed to fetch messages');
    const data = await res.json();
    return (data['hydra:member'] || []).map(m => ({
      id: m.id, from: m.from?.address || m.from?.name || 'Unknown',
      subject: m.subject || 'No Subject', date: m.createdAt,
      _provider: 'mailtm'
    }));
  }

  if (acc.providerType === 'tempmailio') {
    const res = await fetch(`${acc.providerBase}/email/${acc.address}/messages`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    const data = await res.json();
    return (data || []).map(m => ({
      id: m.id, from: m.from || 'Unknown',
      subject: m.subject || 'No Subject', date: m.created_at,
      bodyText: m.body_text, bodyHtml: m.body_html,
      attachments: m.attachments || [], _provider: 'tempmailio'
    }));
  }
  return [];
}

async function readMessageFromProvider(acc, msgId) {
  if (acc.providerType === 'mailtm') {
    let res = await fetch(`${acc.providerBase}/messages/${msgId}`, {
      headers: { 'Authorization': `Bearer ${acc.token}` }
    });
    
    if (res.status === 401 && acc.password) {
      // Assume doFetchMessages already updated the token, or it will on next poll
      // But we can try once more with the current token just in case
      const accs = JSON.parse(localStorage.getItem('kroma_temp_mail_accounts')) || [];
      const updatedAcc = accs.find(a => a.id === acc.id);
      if (updatedAcc?.token) {
        res = await fetch(`${acc.providerBase}/messages/${msgId}`, {
          headers: { 'Authorization': `Bearer ${updatedAcc.token}` }
        });
      }
    }
    
    if (!res.ok) return null;
    const data = await res.json();
    return { html: data.html?.[0] || '', text: data.text || '', attachments: data.attachments || [] };
  }

  if (acc.providerType === 'tempmailio') {
    // temp-mail.io returns full body in the messages list
    return null; // handled inline
  }
  return null;
}

export default function TempMail() {
  const [accounts, setAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kroma_temp_mail_accounts')) || []; } catch { return []; }
  });
  const [activeIdx, setActiveIdx] = useState(() => {
    try { return parseInt(localStorage.getItem('kroma_temp_mail_active') || '0'); } catch { return 0; }
  });
  const [messages, setMessages] = useState(() => {
    const acc = (JSON.parse(localStorage.getItem('kroma_temp_mail_accounts')) || [])[parseInt(localStorage.getItem('kroma_temp_mail_active') || '0')];
    if (acc) {
      try { return JSON.parse(localStorage.getItem(`kroma_temp_mail_msgs_${acc.id}`)) || []; } catch { return []; }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [messageDetails, setMessageDetails] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [activeProvider, setActiveProvider] = useState('');
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState(null);
  const pollRef = useRef(null);

  const account = accounts[activeIdx] || null;

  const save = useCallback((accs, idx) => {
    localStorage.setItem('kroma_temp_mail_accounts', JSON.stringify(accs));
    localStorage.setItem('kroma_temp_mail_active', String(idx ?? 0));
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!account?.token) return;
    doFetchMessages(true);
    pollRef.current = setInterval(() => doFetchMessages(false), 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [account?.token]);

  const generateEmail = async () => {
    setGenerating(true);
    try {
      const result = await tryProviders(generateWithProvider);
      const newAcc = { ...result };
      const newAccounts = [...accounts, newAcc];
      const newIdx = newAccounts.length - 1;
      setAccounts(newAccounts);
      setActiveIdx(newIdx);
      setMessages([]);
      setActiveMessage(null);
      setActiveProvider(result.providerName);
      save(newAccounts, newIdx);
    } catch (e) { console.error('All providers failed:', e); }
    setGenerating(false);
  };

  const doFetchMessages = async (showLoader = false) => {
    if (!account) return;
    if (showLoader) setLoading(true);
    try {
      const msgs = await fetchMessagesFromProvider(account);
      const deletedIds = JSON.parse(localStorage.getItem(`kroma_temp_mail_deleted_${account.id}`)) || [];
      const filteredMsgs = msgs.filter(m => !deletedIds.includes(m.id));
      
      setMessages(filteredMsgs);
      localStorage.setItem(`kroma_temp_mail_msgs_${account.id}`, JSON.stringify(filteredMsgs));
    } catch (e) { console.error('Fetch error:', e); }
    if (showLoader) setLoading(false);
  };

  const openMessage = async (msg) => {
    setActiveMessage(msg);
    setLoadingMessage(true);
    setMessageDetails(null);

    if (msg._provider === 'tempmailio') {
      setMessageDetails({ html: msg.bodyHtml || '', text: msg.bodyText || '', attachments: msg.attachments || [] });
      setLoadingMessage(false);
      return;
    }

    try {
      const detail = await readMessageFromProvider(account, msg.id);
      setMessageDetails(detail);
    } catch (e) { console.error('Read error:', e); }
    setLoadingMessage(false);
  };

  const copyEmail = () => {
    if (!account?.address) return;
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const switchAccount = (idx) => {
    const acc = accounts[idx];
    setActiveIdx(idx);
    try {
      const cached = JSON.parse(localStorage.getItem(`kroma_temp_mail_msgs_${acc?.id}`)) || [];
      setMessages(cached);
    } catch { setMessages([]); }
    setLoading(true);
    setActiveMessage(null);
    localStorage.setItem('kroma_temp_mail_active', String(idx));
  };

  const burnAccount = async () => {
    if (!account) return;
    if (account.providerType === 'mailtm') {
      try { await fetch(`${account.providerBase}/accounts/${account.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${account.token}` } }); } catch {}
    }
    localStorage.removeItem(`kroma_temp_mail_msgs_${account.id}`);
    const newAccounts = accounts.filter((_, i) => i !== activeIdx);
    const newIdx = Math.max(0, activeIdx - 1);
    setAccounts(newAccounts);
    setActiveIdx(newAccounts.length ? newIdx : 0);
    setMessages([]);
    setActiveMessage(null);
    save(newAccounts, newAccounts.length ? newIdx : 0);
  };

  const openSupport = () => {
    const url = 'https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE/discussions';
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    else window.open(url, '_blank');
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmMsg || !account) return;
    const deletedIds = JSON.parse(localStorage.getItem(`kroma_temp_mail_deleted_${account.id}`)) || [];
    deletedIds.push(deleteConfirmMsg.id);
    localStorage.setItem(`kroma_temp_mail_deleted_${account.id}`, JSON.stringify(deletedIds));
    
    setMessages(prev => prev.filter(m => m.id !== deleteConfirmMsg.id));
    if (activeMessage?.id === deleteConfirmMsg.id) {
      setActiveMessage(null);
    }
    setDeleteConfirmMsg(null);
  };

  // ─── Welcome Screen ───
  if (!accounts.length) {
    return (
      <div className="tm-welcome">
        <div className="tm-welcome-inner">
          <div className="tm-welcome-icon"><Mail size={38} color="#a78bfa" /></div>
          <h2>Ephemeral Inbox</h2>
          <div className="tm-brand-sub">Powered by HOLE</div>
          <p>Generate disposable email addresses for testing registration flows, password resets, and blind interactions — all without leaving your workstation.</p>
          <button className="tm-gen-btn" onClick={generateEmail} disabled={generating}>
            {generating ? <RefreshCw size={18} className="tm-spin" /> : <Sparkles size={18} />}
            {generating ? 'Creating...' : 'Generate Address'}
          </button>
          <div className="tm-provider-badge">
            <span className="tm-provider-dot" />
            Multi-provider fallback active
          </div>
        </div>
      </div>
    );
  }

  // ─── Main UI ───
  return (
    <div className="tm-root">
      <div className="tm-sidebar">
        {/* HOLE Branding */}
        <div className="tm-hole-brand">
          <div className="tm-hole-logo">
            {'HOLE'.split('').map((l, i) => <span key={i} className="tm-hole-letter">{l}</span>)}
          </div>
          <div className="tm-hole-tag">Ephemeral Inbox</div>
        </div>

        <div className="tm-email-widget">
          <div className="tm-label">Accounts</div>
          <div className="tm-accounts-bar">
            {accounts.map((acc, i) => (
              <div key={i} className={`tm-account-pill ${i === activeIdx ? 'active' : ''}`} onClick={() => switchAccount(i)} title={acc.address}>
                {acc.address.split('@')[0]}
              </div>
            ))}
            <button className="tm-add-pill" onClick={generateEmail} disabled={generating} title="Add new email">
              {generating ? <RefreshCw size={12} className="tm-spin" /> : <Plus size={12} />}
            </button>
          </div>

          <div className="tm-email-box" onClick={copyEmail}>
            <span className="tm-email-text">{account?.address}</span>
            {copied ? <CheckCircle2 size={14} color="#10B981" /> : <Copy size={14} color="rgba(255,255,255,0.25)" />}
          </div>

          <div className="tm-actions">
            <button className="tm-action-btn refresh" onClick={() => doFetchMessages(true)}>
              <RefreshCw size={12} className={loading ? 'tm-spin' : ''} /> Refresh
            </button>
            <button className="tm-action-btn burn" onClick={burnAccount}>
              <Trash2 size={12} /> Burn
            </button>
          </div>
        </div>

        <div className="tm-messages">
          {loading && messages.length === 0 ? (
            <div className="tm-empty">
              <RefreshCw size={28} className="tm-spin" style={{ opacity: 0.3 }} />
              <div className="tm-empty-text" style={{ marginTop: 16 }}>Loading inbox...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="tm-empty">
              <Inbox size={40} />
              <div className="tm-empty-text">Inbox empty</div>
              <div className="tm-empty-sub">Waiting for emails...</div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`tm-msg-card ${activeMessage?.id === msg.id ? 'active' : ''}`} onClick={() => openMessage(msg)}>
                <div className="tm-msg-header">
                  <span className="tm-msg-from">{msg.from}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="tm-msg-time">{new Date(msg.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button className="tm-msg-delete" onClick={(e) => { e.stopPropagation(); setDeleteConfirmMsg(msg); }} title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="tm-msg-subject">{msg.subject}</div>
              </div>
            ))
          )}
        </div>

        <div className="tm-support" onClick={openSupport}>
          <Heart size={12} color="rgba(255,255,255,0.2)" />
          <span>Community & Support</span>
        </div>
      </div>

      {/* ─── Email Reader ─── */}
      <div className="tm-main">
        {activeMessage ? (
          <div className="tm-reader">
            <div className="tm-reader-header">
              <button className="tm-back-btn" onClick={() => setActiveMessage(null)}>
                <ArrowLeft size={14} /> Back
              </button>
              <h1 className="tm-reader-title">{activeMessage.subject}</h1>
              <div className="tm-sender-row">
                <div className="tm-sender-avatar">{(activeMessage.from || '?').charAt(0).toUpperCase()}</div>
                <div>
                  <div className="tm-sender-name">{activeMessage.from}</div>
                  <div className="tm-sender-date">{new Date(activeMessage.date).toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className="tm-reader-body">
              {loadingMessage ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                  <RefreshCw className="tm-spin" size={22} color="rgba(255,255,255,0.12)" />
                </div>
              ) : messageDetails ? (
                <div className="tm-email-content">
                  {messageDetails.html ? (
                    <iframe title="Email" srcDoc={messageDetails.html} sandbox="allow-same-origin allow-popups" />
                  ) : (
                    <div className="text-body">{messageDetails.text || 'Empty message.'}</div>
                  )}
                  {messageDetails.attachments?.length > 0 && (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(0,0,0,0.35)', textTransform: 'uppercase', marginBottom: 8 }}>Attachments</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {messageDetails.attachments.map((att, i) => (
                          <span key={i} style={{ padding: '5px 12px', background: 'rgba(0,0,0,0.04)', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <ExternalLink size={11} /> {att.filename || att.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 40 }}>Failed to load message.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="tm-placeholder"><Mail size={100} /></div>
        )}
      </div>

      {deleteConfirmMsg && (
        <ConfirmModal
          title="Delete Email"
          message={`Are you sure you want to delete this email from "${deleteConfirmMsg.from}"?`}
          warning="This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirmMsg(null)}
        />
      )}
    </div>
  );
}
