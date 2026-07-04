import { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, Copy, Check, Shield, Trash2, ArrowLeft, Radio } from 'lucide-react';
import '../styles/TempNumber.css';

export default function TempNumber() {
  const [numbers, setNumbers] = useState([]);
  const [activeNumber, setActiveNumber] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [activeMessage, setActiveMessage] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('united-states');

  const COUNTRIES = [
    { id: 'united-states', name: 'United States', flag: '🇺🇸' },
    { id: 'united-kingdom', name: 'United Kingdom', flag: '🇬🇧' },
    { id: 'canada', name: 'Canada', flag: '🇨🇦' },
    { id: 'france', name: 'France', flag: '🇫🇷' },
    { id: 'india', name: 'India', flag: '🇮🇳' },
    { id: 'netherlands', name: 'Netherlands', flag: '🇳🇱' },
    { id: 'belgium', name: 'Belgium', flag: '🇧🇪' },
    { id: 'sweden', name: 'Sweden', flag: '🇸🇪' }
  ];

  useEffect(() => {
    // Load saved numbers on boot
    try {
      const saved = JSON.parse(localStorage.getItem('kroma_temp_number_accounts')) || [];
      setNumbers(saved);
      const active = parseInt(localStorage.getItem('kroma_temp_number_active') || '0');
      if (saved[active]) switchNumber(active, saved);
    } catch {}
  }, []);

  const generateNumber = async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.scrapeTempSms('get_numbers', selectedCountry);
      if (res.success && res.numbers.length > 0) {
        // Pick a random number that isn't already added
        const available = res.numbers.filter(n => !numbers.includes(n));
        const num = available.length > 0 ? available[0] : res.numbers[0];
        if (!numbers.includes(num)) {
          const newNumbers = [...numbers, num];
          setNumbers(newNumbers);
          localStorage.setItem('kroma_temp_number_accounts', JSON.stringify(newNumbers));
          switchNumber(newNumbers.length - 1, newNumbers);
        }
      } else {
        alert(res.error || 'Failed to fetch numbers. Anti-bot protection might be active.');
      }
    } catch (e) {
      alert('Error fetching numbers: ' + e.message);
    }
    setLoading(false);
  };

  const doFetchMessages = async (num, showLoader = false) => {
    if (showLoader) setFetching(true);
    try {
      const country = numbers.find(n => n.number === num)?.country || 'united-states';
      const res = await window.electronAPI.scrapeTempSms('get_messages', { number: num, country });
      if (res.success) {
        setMessages(res.messages);
        localStorage.setItem(`kroma_temp_number_msgs_${num}`, JSON.stringify(res.messages));
      }
    } catch (e) { console.error('Fetch error:', e); }
    if (showLoader) setFetching(false);
  };

  // Poll for messages every 15s if a number is active
  useEffect(() => {
    let interval;
    if (activeNumber) {
      doFetchMessages(activeNumber, false);
      interval = setInterval(() => doFetchMessages(activeNumber, false), 15000);
    }
    return () => clearInterval(interval);
  }, [activeNumber]);

  const switchNumber = (idx, nums = numbers) => {
    const num = nums[idx];
    setActiveNumber(num);
    try {
      const cached = JSON.parse(localStorage.getItem(`kroma_temp_number_msgs_${num}`)) || [];
      setMessages(cached);
    } catch { setMessages([]); }
    setFetching(true);
    setActiveMessage(null);
    localStorage.setItem('kroma_temp_number_active', String(idx));
  };

  const burnNumber = () => {
    if (!activeNumber) return;
    localStorage.removeItem(`kroma_temp_number_msgs_${activeNumber}`);
    const activeIdx = numbers.indexOf(activeNumber);
    const newNumbers = numbers.filter((_, i) => i !== activeIdx);
    const newIdx = Math.max(0, activeIdx - 1);
    setNumbers(newNumbers);
    localStorage.setItem('kroma_temp_number_accounts', JSON.stringify(newNumbers));
    
    if (newNumbers.length > 0) {
      switchNumber(newIdx, newNumbers);
    } else {
      setActiveNumber(null);
      setMessages([]);
      localStorage.setItem('kroma_temp_number_active', '0');
    }
  };

  const copyNumber = () => {
    if (!activeNumber) return;
    navigator.clipboard.writeText(`+1${activeNumber}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (numbers.length === 0) {
    return (
      <div className="tn-root">
        <div className="tn-welcome" style={{flex: 1}}>
          <div className="tn-welcome-inner">
            <div className="tn-welcome-icon">
              <Smartphone size={40} color="#0ea5e9" />
            </div>
            <h2>Temp SMS Engine</h2>
            <div className="tn-brand-sub">Bypass SMS Verification</div>
            <p>
              Instantly generate disposable phone numbers to bypass 2FA, register test accounts, and shield your privacy during security research.
            </p>
            <div style={{display: 'flex', gap: '8px', marginBottom: '24px'}}>
              <select 
                className="tn-gen-btn" 
                style={{background: 'rgba(255,255,255,0.05)', boxShadow: 'none'}}
                value={selectedCountry}
                onChange={e => setSelectedCountry(e.target.value)}
                disabled={loading}
              >
                {COUNTRIES.map(c => <option key={c.id} value={c.id} style={{color: '#000'}}>{c.flag} {c.name}</option>)}
              </select>
              <button className="tn-gen-btn" onClick={generateNumber} disabled={loading}>
                {loading ? <RefreshCw size={18} className="tn-spin" /> : <Shield size={18} />}
                {loading ? 'Bypassing Cloudflare...' : 'Generate Number'}
              </button>
            </div>
            <div className="tn-provider-badge">
              <div className="tn-provider-dot"></div>
              Powered by headless routing
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tn-root">
      {/* Sidebar Panel */}
      <div className="tn-sidebar">
        <div className="tn-hole-brand">
          <div className="tn-hole-logo">
            <span className="tn-hole-letter">T</span>
            <span className="tn-hole-letter">E</span>
            <span className="tn-hole-letter">M</span>
            <span className="tn-hole-letter">P</span>
          </div>
          <span className="tn-hole-tag">NUMBER</span>
        </div>

        <div className="tn-email-widget">
          <div className="tn-label">Your Active Numbers</div>
          <div className="tn-accounts-bar">
            {numbers.map((num, i) => (
              <button 
                key={num} 
                className={`tn-account-pill ${activeNumber === num ? 'active' : ''}`}
                onClick={() => switchNumber(i)}
                title={`+1 ${num}`}
              >
                +1 {num.substring(0, 3)}...
              </button>
            ))}
            {numbers.length < 5 && (
              <button className="tn-add-pill" onClick={generateNumber} disabled={loading}>
                + New
              </button>
            )}
          </div>
          
          <div className="tn-email-box" onClick={copyNumber} title="Click to copy">
            <div className="tn-email-text" style={{fontSize: '18px', fontWeight: 800}}>+1 {activeNumber}</div>
            {copied ? <Check size={16} color="#0ea5e9" /> : <Copy size={16} color="var(--text-muted)" />}
          </div>
          
          <div className="tn-actions">
            <button className="tn-action-btn refresh" onClick={() => doFetchMessages(activeNumber, true)}>
              <RefreshCw size={14} className={fetching ? 'tn-spin' : ''} /> Refresh
            </button>
            <button className="tn-action-btn burn" onClick={burnNumber}>
              <Trash2 size={14} /> Burn
            </button>
          </div>
        </div>

        <div className="tn-messages">
          {fetching && messages.length === 0 ? (
             <div className="tn-empty">
               <RefreshCw size={24} className="tn-spin" color="rgba(255,255,255,0.2)" />
               <div className="tn-empty-text">Connecting to SMS gateway...</div>
             </div>
          ) : messages.length === 0 ? (
            <div className="tn-empty">
              <Radio size={32} color="rgba(255,255,255,0.2)" />
              <div className="tn-empty-text">Inbox empty</div>
              <div className="tn-empty-sub">Waiting for incoming SMS...</div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div 
                key={i} 
                className={`tn-msg-card ${activeMessage === m ? 'active' : ''}`}
                onClick={() => setActiveMessage(m)}
              >
                <div className="tn-msg-header">
                  <span className="tn-msg-from">{m.sender}</span>
                  <span className="tn-msg-time">{m.time}</span>
                </div>
                <div className="tn-msg-subject">{m.body.substring(0, 40)}...</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main View Panel */}
      <div className="tn-main">
        {!activeMessage ? (
          <div className="tn-placeholder">
            <Smartphone size={80} color="rgba(255,255,255,0.5)" />
          </div>
        ) : (
          <div className="tn-reader">
            <div className="tn-reader-header">
              <button className="tn-back-btn" onClick={() => setActiveMessage(null)}>
                <ArrowLeft size={14} /> Back to Inbox
              </button>
              <h2 className="tn-reader-title">Incoming Verification Code</h2>
              <div className="tn-sender-row">
                <div className="tn-sender-avatar">{activeMessage.sender.charAt(0)}</div>
                <div>
                  <div className="tn-sender-name">{activeMessage.sender}</div>
                  <div className="tn-sender-date">{activeMessage.time}</div>
                </div>
              </div>
            </div>
            <div className="tn-reader-body">
              <div className="tn-email-content">
                <div className="text-body" style={{fontSize: '24px', fontWeight: 700, letterSpacing: '1px'}}>{activeMessage.body}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
