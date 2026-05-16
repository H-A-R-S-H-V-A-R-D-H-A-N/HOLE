import React, { useState, useRef } from 'react';
import { Shield, Play, Key, Unlock, AlertTriangle, Code, CheckCheck, RefreshCw, Save } from 'lucide-react';
import CryptoJS from 'crypto-js';
import '../styles/Tools.css';

// Base64Url encode/decode utilities
const b64uEncode = (str) => {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const b64uDecode = (str) => {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) { b64 += '='; }
    return decodeURIComponent(escape(atob(b64)));
  } catch (e) {
    return null;
  }
};

const hexToBase64Url = (hex) => {
  const words = CryptoJS.enc.Hex.parse(hex);
  const b64 = CryptoJS.enc.Base64.stringify(words);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export default function JWTForger() {
  const [rawToken, setRawToken] = useState('');
  const [headerJson, setHeaderJson] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  const [payloadJson, setPayloadJson] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');
  const [signature, setSignature] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Brute forcer state
  const [wordlist, setWordlist] = useState('secret\npassword\nadmin\n123456\nchangeme\nkey\ntest\nqwerty');
  const [isCracking, setIsCracking] = useState(false);
  const [crackedSecret, setCrackedSecret] = useState(null);
  const [crackProgress, setCrackProgress] = useState('');
  const cancelRef = useRef(false);

  // Parse Raw Token when it changes
  const handleRawChange = (val) => {
    setRawToken(val);
    const parts = val.split('.');
    if (parts.length >= 2) {
      const decodedHeader = b64uDecode(parts[0]);
      const decodedPayload = b64uDecode(parts[1]);
      
      if (decodedHeader) {
        try { setHeaderJson(JSON.stringify(JSON.parse(decodedHeader), null, 2)); } 
        catch { setHeaderJson(decodedHeader); }
      }
      if (decodedPayload) {
        try { setPayloadJson(JSON.stringify(JSON.parse(decodedPayload), null, 2)); } 
        catch { setPayloadJson(decodedPayload); }
      }
      if (parts[2] !== undefined) {
        setSignature(parts[2]);
      }
    }
  };

  // Re-encode from JSON panels
  const compileToken = (head, pay, sig) => {
    try {
      // Validate JSON
      JSON.parse(head);
      JSON.parse(pay);
      const encHead = b64uEncode(head);
      const encPay = b64uEncode(pay);
      const newToken = `${encHead}.${encPay}${sig !== null ? '.' + sig : ''}`;
      setRawToken(newToken);
      setError(null);
    } catch (e) {
      setError("Invalid JSON in Header or Payload");
    }
  };

  const handleHeaderChange = (val) => {
    setHeaderJson(val);
    compileToken(val, payloadJson, signature);
  };

  const handlePayloadChange = (val) => {
    setPayloadJson(val);
    compileToken(headerJson, val, signature);
  };

  const signToken = () => {
    try {
      const headObj = JSON.parse(headerJson);
      const encHead = b64uEncode(headerJson);
      const encPay = b64uEncode(payloadJson);
      const dataToSign = `${encHead}.${encPay}`;
      
      let sigHex = '';
      if (headObj.alg === 'HS256') sigHex = CryptoJS.HmacSHA256(dataToSign, secret).toString();
      else if (headObj.alg === 'HS384') sigHex = CryptoJS.HmacSHA384(dataToSign, secret).toString();
      else if (headObj.alg === 'HS512') sigHex = CryptoJS.HmacSHA512(dataToSign, secret).toString();
      else {
        setError(`Cannot auto-sign algorithm: ${headObj.alg}. Only HS256/384/512 supported for secret signing.`);
        return;
      }

      const b64Sig = hexToBase64Url(sigHex);
      setSignature(b64Sig);
      compileToken(headerJson, payloadJson, b64Sig);
    } catch (e) {
      setError("Failed to sign: Make sure JSON is valid.");
    }
  };

  const executeNoneAttack = () => {
    try {
      const headObj = JSON.parse(headerJson);
      headObj.alg = "none";
      const newHead = JSON.stringify(headObj, null, 2);
      setHeaderJson(newHead);
      setSignature('');
      compileToken(newHead, payloadJson, '');
    } catch (e) {
      setError("Invalid JSON in Header.");
    }
  };

  const startBruteForce = async () => {
    if (!rawToken || rawToken.split('.').length < 3) {
      setError("Please paste a valid JWT with a signature first.");
      return;
    }
    
    cancelRef.current = false;
    setIsCracking(true);
    setCrackedSecret(null);
    setCrackProgress('Initializing...');
    setError(null);

    const parts = rawToken.split('.');
    const dataToSign = `${parts[0]}.${parts[1]}`;
    const targetSig = parts[2];
    
    let alg = 'HS256';
    try {
      const head = JSON.parse(b64uDecode(parts[0]));
      alg = head.alg || 'HS256';
    } catch (e) {}

    const words = wordlist.split('\n').map(w => w.trim()).filter(w => w);
    
    // Process in small batches so UI doesn't freeze
    let i = 0;
    const batchSize = 100;
    
    const crackBatch = () => {
      if (cancelRef.current) return;
      
      const end = Math.min(i + batchSize, words.length);
      for (; i < end; i++) {
        const word = words[i];
        let sigHex = '';
        if (alg === 'HS256') sigHex = CryptoJS.HmacSHA256(dataToSign, word).toString();
        else if (alg === 'HS384') sigHex = CryptoJS.HmacSHA384(dataToSign, word).toString();
        else if (alg === 'HS512') sigHex = CryptoJS.HmacSHA512(dataToSign, word).toString();
        
        const candidateSig = hexToBase64Url(sigHex);
        
        if (candidateSig === targetSig) {
          setCrackedSecret(word);
          setSecret(word);
          setIsCracking(false);
          setCrackProgress(`CRACKED! Secret is: ${word}`);
          return;
        }
      }
      
      if (i < words.length) {
        setCrackProgress(`Tested ${i} / ${words.length} words...`);
        setTimeout(crackBatch, 10);
      } else {
        setIsCracking(false);
        setCrackProgress('Finished. Secret not found in wordlist.');
      }
    };
    
    setTimeout(crackBatch, 10);
  };

  const stopBruteForce = () => {
    cancelRef.current = true;
    setIsCracking(false);
    setCrackProgress('Brute force aborted.');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tool-page page-enter" style={{ padding: '24px' }}>
      <div className="tool-header">
        <div className="tool-header-left">
          <Shield size={28} />
          <div>
            <h1 className="tool-title">JWT Forger</h1>
            <p className="tool-subtitle">Decode, Brute-Force, and Forge JSON Web Tokens Offline</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#EF4444',
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Raw Token Input */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label className="tool-label" style={{ margin: 0 }}>RAW TOKEN</label>
          <button className="btn btn-primary btn-sm" onClick={copyToClipboard} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {copied ? <CheckCheck size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <textarea
          className="tool-input"
          value={rawToken}
          onChange={(e) => handleRawChange(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          style={{ height: '100px', fontFamily: 'var(--font-mono)', resize: 'vertical', wordBreak: 'break-all' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {/* Editor Side */}
        <div style={{ flex: 2, minWidth: '350px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label className="tool-label" style={{ color: 'var(--accent-red)' }}>HEADER (JSON)</label>
            <textarea
              className="tool-input"
              value={headerJson}
              onChange={(e) => handleHeaderChange(e.target.value)}
              style={{ height: '120px', fontFamily: 'var(--font-mono)', color: 'var(--accent-red)' }}
            />
          </div>

          <div>
            <label className="tool-label" style={{ color: 'var(--accent-purple)' }}>PAYLOAD (JSON)</label>
            <textarea
              className="tool-input"
              value={payloadJson}
              onChange={(e) => handlePayloadChange(e.target.value)}
              style={{ height: '220px', fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}
            />
          </div>

        </div>

        {/* Tools Side */}
        <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={16} style={{ color: 'var(--accent-primary)' }} /> Signature Generation
            </h3>
            <label className="tool-label">SECRET KEY</label>
            <input
              className="tool-input"
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="your-256-bit-secret"
              style={{ marginBottom: '12px' }}
            />
            <button className="btn btn-primary" onClick={signToken} style={{ width: '100%', justifyContent: 'center' }}>
              <Save size={16} /> Sign Token
            </button>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: 'var(--accent-yellow)' }} /> Vulnerability Attacks
            </h3>
            
            <button className="btn btn-ghost" onClick={executeNoneAttack} style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
              <Code size={16} /> Execute "None" Alg Attack
            </button>

            <label className="tool-label">SECRET BRUTE-FORCER WORDLIST</label>
            <textarea
              className="tool-input"
              value={wordlist}
              onChange={(e) => setWordlist(e.target.value)}
              style={{ height: '120px', fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '12px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={startBruteForce} disabled={isCracking} style={{ flex: 1, justifyContent: 'center' }}>
                {isCracking ? <RefreshCw size={16} className="spin" /> : <Unlock size={16} />} 
                {isCracking ? 'Cracking...' : 'Crack'}
              </button>
              {isCracking && (
                <button className="btn btn-ghost" onClick={stopBruteForce} style={{ justifyContent: 'center', color: '#EF4444', border: '1px solid #EF4444' }}>
                  Stop
                </button>
              )}
            </div>
            {crackProgress && (
              <p style={{ marginTop: '12px', fontSize: '12px', color: crackedSecret ? 'var(--accent-green)' : 'var(--text-secondary)', textAlign: 'center' }}>
                {crackProgress}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
// Add the copy icon since I forgot it
function Copy({ size }) { return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>; }
