import React, { useState, useEffect, useRef } from 'react';
import { Mail, RefreshCw, Copy, CheckCircle2, Inbox, Trash2, ArrowLeft, ExternalLink, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

const API_BASE = 'https://www.1secmail.com/api/v1/';

export default function TempMail() {
  const [email, setEmail] = useState(() => localStorage.getItem('kroma_temp_mail') || '');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [messageDetails, setMessageDetails] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState(false);

  // Poll for messages
  useEffect(() => {
    if (!email) return;

    fetchMessages(true);
    const interval = setInterval(() => {
      fetchMessages(false);
    }, 8000); // Check every 8 seconds

    return () => clearInterval(interval);
  }, [email]);

  const generateEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?action=genRandomMailbox&count=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const newEmail = data[0];
        setEmail(newEmail);
        localStorage.setItem('kroma_temp_mail', newEmail);
        setMessages([]);
        setActiveMessage(null);
      }
    } catch (e) {
      console.error('Failed to generate email:', e);
    }
    setLoading(false);
  };

  const fetchMessages = async (showLoader = false) => {
    if (!email) return;
    if (showLoader) setLoading(true);
    
    try {
      const [login, domain] = email.split('@');
      const res = await fetch(`${API_BASE}?action=getMessages&login=${login}&domain=${domain}`);
      const data = await res.json();
      setMessages(data || []);
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    }
    
    if (showLoader) setLoading(false);
  };

  const openMessage = async (msg) => {
    setActiveMessage(msg);
    setLoadingMessage(true);
    setMessageDetails(null);
    
    try {
      const [login, domain] = email.split('@');
      const res = await fetch(`${API_BASE}?action=readMessage&login=${login}&domain=${domain}&id=${msg.id}`);
      const data = await res.json();
      setMessageDetails(data);
    } catch (e) {
      console.error('Failed to read message:', e);
    }
    
    setLoadingMessage(false);
  };

  const copyToClipboard = () => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteEmail = () => {
    setEmail('');
    localStorage.removeItem('kroma_temp_mail');
    setMessages([]);
    setActiveMessage(null);
  };

  if (!email) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#020202', color: '#FFF' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 0 40px rgba(255,255,255,0.02)' }}>
            <Mail size={32} color="rgba(255,255,255,0.6)" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-0.5px' }}>Ephemeral Inbox</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px' }}>
            Generate a disposable email address for testing registration flows, bypassing filters, and analyzing blind interactions.
          </p>
          <button 
            onClick={generateEmail}
            disabled={loading}
            style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', backgroundColor: '#FFF', color: '#000', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', transition: 'all 0.3s', boxShadow: '0 10px 30px rgba(255,255,255,0.1)' }}
          >
            {loading ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
            Generate New Address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#020202', color: '#E2E8F0', overflow: 'hidden' }}>
      
      {/* Sidebar: Email & Inbox */}
      <div style={{ width: '380px', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', backgroundColor: '#050505' }}>
        
        {/* Email Display Widget */}
        <div style={{ padding: '32px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Current Address</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div 
              style={{ padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={copyToClipboard}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#FFF' }}>{email}</span>
              {copied ? <CheckCircle2 size={16} color="#10B981" /> : <Copy size={16} color="rgba(255,255,255,0.4)" />}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => fetchMessages(true)} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: '#FFF', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
              </button>
              <button onClick={deleteEmail} style={{ flex: 1, padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Trash2 size={14} /> Burn
              </button>
            </div>
          </div>
        </div>

        {/* Message List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
              <Inbox size={48} style={{ marginBottom: '16px' }} />
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Inbox is empty</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Waiting for emails...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {messages.map(msg => (
                <div 
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  style={{ padding: '16px', borderRadius: '12px', backgroundColor: activeMessage?.id === msg.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)', border: '1px solid', borderColor: activeMessage?.id === msg.id ? 'rgba(255,255,255,0.1)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{msg.from}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {msg.subject || 'No Subject'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Email Viewer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#020202', position: 'relative' }}>
        {activeMessage ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Email Header */}
            <div style={{ padding: '32px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#050505' }}>
              <button onClick={() => setActiveMessage(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0, marginBottom: '24px', transition: 'color 0.2s' }}>
                <ArrowLeft size={16} /> Back to Inbox
              </button>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#FFF', margin: '0 0 16px 0', lineHeight: 1.3 }}>{activeMessage.subject || 'No Subject'}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#FFF' }}>
                  {activeMessage.from.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#E2E8F0' }}>{activeMessage.from}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{new Date(activeMessage.date).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
              {loadingMessage ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><RefreshCw className="spin" size={24} color="rgba(255,255,255,0.2)" /></div>
              ) : messageDetails ? (
                <div style={{ backgroundColor: '#FFF', borderRadius: '12px', padding: '32px', color: '#000', minHeight: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                  {messageDetails.htmlBody ? (
                    <iframe 
                      title="Email Content"
                      srcDoc={messageDetails.htmlBody} 
                      style={{ width: '100%', height: '600px', border: 'none' }}
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', lineHeight: 1.6 }}>
                      {messageDetails.textBody}
                    </div>
                  )}
                  
                  {messageDetails.attachments && messageDetails.attachments.length > 0 && (
                    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', marginBottom: '12px' }}>Attachments</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {messageDetails.attachments.map((att, i) => (
                          <div key={i} style={{ padding: '8px 16px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExternalLink size={14} />
                            {att.filename}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Failed to load message.</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}>
            <Mail size={120} />
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
