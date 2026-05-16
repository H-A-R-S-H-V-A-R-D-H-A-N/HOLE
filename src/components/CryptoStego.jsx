import React, { useState, useRef } from 'react';
import { Lock, Image as ImageIcon, Eye, EyeOff, Hash, Key, Download, UploadCloud, AlertTriangle, CheckCheck } from 'lucide-react';
import CryptoJS from 'crypto-js';
import '../styles/Tools.css';

export default function CryptoStego() {
  const [activeTab, setActiveTab] = useState('crypto');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- CRYPTO STATE ---
  const [cryptoAction, setCryptoAction] = useState('Encrypt'); // Encrypt, Decrypt, Hash
  const [cryptoAlg, setCryptoAlg] = useState('AES');
  const [cryptoInput, setCryptoInput] = useState('');
  const [cryptoOutput, setCryptoOutput] = useState('');
  const [cryptoKey, setCryptoKey] = useState('');
  const [cryptoIV, setCryptoIV] = useState('');
  const [cryptoMode, setCryptoMode] = useState('CBC');
  const [cryptoPad, setCryptoPad] = useState('Pkcs7');

  // --- STEGO STATE ---
  const [stegoAction, setStegoAction] = useState('Encode'); // Encode, Decode
  const [stegoImage, setStegoImage] = useState(null);
  const [stegoImageSrc, setStegoImageSrc] = useState(null);
  const [stegoSecret, setStegoSecret] = useState('');
  const canvasRef = useRef(null);

  // ==========================================
  // CRYPTO ENGINE
  // ==========================================
  const executeCrypto = () => {
    setError(null);
    setSuccess(null);
    try {
      if (cryptoAction === 'Hash') {
        let hashStr = '';
        if (cryptoAlg === 'MD5') hashStr = CryptoJS.MD5(cryptoInput).toString();
        else if (cryptoAlg === 'SHA1') hashStr = CryptoJS.SHA1(cryptoInput).toString();
        else if (cryptoAlg === 'SHA256') hashStr = CryptoJS.SHA256(cryptoInput).toString();
        else if (cryptoAlg === 'SHA512') hashStr = CryptoJS.SHA512(cryptoInput).toString();
        else if (cryptoAlg === 'SHA3') hashStr = CryptoJS.SHA3(cryptoInput).toString();
        setCryptoOutput(hashStr);
        return;
      }

      // Encrypt / Decrypt
      if (!cryptoKey) {
        setError('A Secret Key is required for encryption/decryption.');
        return;
      }

      const modeMap = { CBC: CryptoJS.mode.CBC, ECB: CryptoJS.mode.ECB, CTR: CryptoJS.mode.CTR };
      const padMap = { Pkcs7: CryptoJS.pad.Pkcs7, ZeroPadding: CryptoJS.pad.ZeroPadding, NoPadding: CryptoJS.pad.NoPadding };
      
      const cfg = {
        mode: modeMap[cryptoMode],
        padding: padMap[cryptoPad]
      };
      if (cryptoIV && cryptoMode !== 'ECB') {
        cfg.iv = CryptoJS.enc.Utf8.parse(cryptoIV);
      }

      const keyParsed = CryptoJS.enc.Utf8.parse(cryptoKey);
      let result = '';

      if (cryptoAction === 'Encrypt') {
        if (cryptoAlg === 'AES') result = CryptoJS.AES.encrypt(cryptoInput, keyParsed, cfg).toString();
        else if (cryptoAlg === 'DES') result = CryptoJS.DES.encrypt(cryptoInput, keyParsed, cfg).toString();
        else if (cryptoAlg === 'TripleDES') result = CryptoJS.TripleDES.encrypt(cryptoInput, keyParsed, cfg).toString();
        else if (cryptoAlg === 'RC4') result = CryptoJS.RC4.encrypt(cryptoInput, keyParsed, cfg).toString(); // RC4 doesn't use IV/Mode
      } else {
        let decryptedBytes;
        if (cryptoAlg === 'AES') decryptedBytes = CryptoJS.AES.decrypt(cryptoInput, keyParsed, cfg);
        else if (cryptoAlg === 'DES') decryptedBytes = CryptoJS.DES.decrypt(cryptoInput, keyParsed, cfg);
        else if (cryptoAlg === 'TripleDES') decryptedBytes = CryptoJS.TripleDES.decrypt(cryptoInput, keyParsed, cfg);
        else if (cryptoAlg === 'RC4') decryptedBytes = CryptoJS.RC4.decrypt(cryptoInput, keyParsed, cfg);
        
        result = decryptedBytes.toString(CryptoJS.enc.Utf8);
        if (!result) throw new Error("Malformed UTF-8 data (incorrect key or corrupted ciphertext)");
      }
      
      setCryptoOutput(result);
    } catch (err) {
      setError(`Crypto Error: ${err.message}`);
      setCryptoOutput('');
    }
  };

  // ==========================================
  // STEGANOGRAPHY ENGINE
  // ==========================================
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setStegoImage(file);
      const url = URL.createObjectURL(file);
      setStegoImageSrc(url);
      setSuccess("Image loaded successfully into the Pixel Vault.");
      setError(null);
    }
  };

  const DELIMITER = ':::KROMA_END:::';

  const executeStego = () => {
    if (!stegoImageSrc) {
      setError("Please upload an image first.");
      return;
    }
    setError(null);
    setSuccess(null);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data; // [r,g,b,a, r,g,b,a...]

      if (stegoAction === 'Encode') {
        if (!stegoSecret) {
          setError("Please enter a secret message to hide.");
          return;
        }
        const fullMessage = stegoSecret + DELIMITER;
        // Convert to binary string
        let binStr = '';
        for (let i = 0; i < fullMessage.length; i++) {
          let bin = fullMessage.charCodeAt(i).toString(2);
          binStr += '00000000'.slice(bin.length) + bin; // Pad to 8 bits
        }

        if (binStr.length > data.length * 0.75) {
          setError("Message is too long to hide in this image. Use a larger image.");
          return;
        }

        let binIdx = 0;
        for (let i = 0; i < data.length && binIdx < binStr.length; i++) {
          if ((i + 1) % 4 === 0) continue; // Skip Alpha channel
          const bit = parseInt(binStr[binIdx], 10);
          data[i] = (data[i] & ~1) | bit; // Clear LSB and set to our bit
          binIdx++;
        }

        ctx.putImageData(imgData, 0, 0);
        setStegoImageSrc(canvas.toDataURL('image/png'));
        setSuccess("Message successfully hidden inside the image! Click Download Image.");
      } else {
        // Decode - Non-blocking chunked processing
        let decodedStr = '';
        let currentByte = 0;
        let bitCount = 0;
        const lastDelimCharCode = DELIMITER.charCodeAt(DELIMITER.length - 1);
        let i = 0;
        const CHUNK_SIZE = 500000; // Process 500,000 pixels at a time
        
        const processChunk = () => {
          const end = Math.min(i + CHUNK_SIZE, data.length);
          
          for (; i < end; i++) {
            if ((i + 1) % 4 === 0) continue;
            
            currentByte = (currentByte << 1) | (data[i] & 1);
            bitCount++;
            
            if (bitCount === 8) {
              decodedStr += String.fromCharCode(currentByte);
              
              if (currentByte === lastDelimCharCode) {
                if (decodedStr.endsWith(DELIMITER)) {
                  setStegoSecret(decodedStr.slice(0, -DELIMITER.length));
                  setSuccess("Hidden message extracted successfully!");
                  return;
                }
              }
              
              currentByte = 0;
              bitCount = 0;
            }
          }
          
          if (i < data.length) {
            setStegoSecret(`Extracting... Scanned ${Math.floor((i / data.length) * 100)}%`);
            setTimeout(processChunk, 10);
          } else {
            setError("No valid hidden message found in this image.");
            setStegoSecret('');
          }
        };
        
        setStegoSecret('Initializing extraction engine...');
        setTimeout(processChunk, 10);
      }
    };
    img.src = stegoImageSrc;
  };

  const downloadStegoImage = () => {
    if (stegoAction !== 'Encode' || !stegoImageSrc) return;
    const a = document.createElement('a');
    a.href = stegoImageSrc;
    a.download = 'infected_vault.png';
    a.click();
  };

  return (
    <div className="tool-page page-enter" style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div className="tool-header">
        <div className="tool-header-left">
          <Lock size={28} />
          <div>
            <h1 className="tool-title">Crypto & Stego Engine</h1>
            <p className="tool-subtitle">Advanced Offline Cryptography & Image Data Hiding</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button className={`btn ${activeTab === 'crypto' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => {setActiveTab('crypto'); setError(null); setSuccess(null);}}>
          <Key size={16} /> Cryptography
        </button>
        <button className={`btn ${activeTab === 'stego' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => {setActiveTab('stego'); setError(null); setSuccess(null);}}>
          <ImageIcon size={16} /> Steganography (Pixel Vault)
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#EF4444' }}>
          <AlertTriangle size={16} /><span>{error}</span>
        </div>
      )}
      
      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#10B981' }}>
          <CheckCheck size={16} /><span>{success}</span>
        </div>
      )}

      {/* ================= CRYPTO UI ================= */}
      {activeTab === 'crypto' && (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 2, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="tool-label">INPUT DATA</label>
              <textarea 
                className="tool-input" 
                value={cryptoInput} 
                onChange={e => setCryptoInput(e.target.value)}
                placeholder="Enter plaintext or ciphertext here..."
                style={{ height: '150px', fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div>
              <label className="tool-label">OUTPUT RESULT</label>
              <textarea 
                className="tool-input" 
                value={cryptoOutput} 
                readOnly
                style={{ height: '150px', fontFamily: 'var(--font-mono)', background: 'var(--bg-tertiary)', color: 'var(--accent-green)' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '300px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Hash size={16} style={{ color: 'var(--accent-primary)' }} /> Engine Configuration
            </h3>
            
            <label className="tool-label">ACTION</label>
            <select className="tool-input" value={cryptoAction} onChange={e => setCryptoAction(e.target.value)} style={{ marginBottom: '16px' }}>
              <option>Encrypt</option>
              <option>Decrypt</option>
              <option>Hash</option>
            </select>

            <label className="tool-label">ALGORITHM</label>
            <select className="tool-input" value={cryptoAlg} onChange={e => setCryptoAlg(e.target.value)} style={{ marginBottom: '16px' }}>
              {cryptoAction === 'Hash' ? (
                <>
                  <option>MD5</option><option>SHA1</option><option>SHA256</option><option>SHA512</option><option>SHA3</option>
                </>
              ) : (
                <>
                  <option>AES</option><option>DES</option><option>TripleDES</option><option>RC4</option>
                </>
              )}
            </select>

            {cryptoAction !== 'Hash' && (
              <>
                <label className="tool-label">SECRET KEY</label>
                <input className="tool-input" type="text" value={cryptoKey} onChange={e => setCryptoKey(e.target.value)} style={{ marginBottom: '16px' }} />

                {cryptoAlg !== 'RC4' && (
                  <>
                    <label className="tool-label">INITIALIZATION VECTOR (IV) (Optional)</label>
                    <input className="tool-input" type="text" value={cryptoIV} onChange={e => setCryptoIV(e.target.value)} style={{ marginBottom: '16px' }} />

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <label className="tool-label">CIPHER MODE</label>
                        <select className="tool-input" value={cryptoMode} onChange={e => setCryptoMode(e.target.value)}>
                          <option>CBC</option><option>ECB</option><option>CTR</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="tool-label">PADDING</label>
                        <select className="tool-input" value={cryptoPad} onChange={e => setCryptoPad(e.target.value)}>
                          <option>Pkcs7</option><option>ZeroPadding</option><option>NoPadding</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <button className="btn btn-primary" onClick={executeCrypto} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
              <Lock size={16} /> Execute {cryptoAction}
            </button>
          </div>
        </div>
      )}

      {/* ================= STEGO UI ================= */}
      {activeTab === 'stego' && (
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'var(--bg-tertiary)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '40px 20px', textAlign: 'center', position: 'relative' }}>
              <input type="file" accept="image/png, image/jpeg" onChange={handleImageUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              <UploadCloud size={32} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
              <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: 'var(--text-primary)' }}>Upload Carrier Image</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Drop a PNG or JPG here</p>
            </div>

            {stegoImageSrc && (
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000' }}>
                <img src={stegoImageSrc} alt="Vault Carrier" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} />
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
          </div>

          <div style={{ flex: 1, minWidth: '300px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={16} style={{ color: 'var(--accent-primary)' }} /> LSB Pixel Engine
            </h3>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button className={`btn ${stegoAction === 'Encode' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => {setStegoAction('Encode'); setStegoSecret(''); setError(null); setSuccess(null);}} style={{ flex: 1, justifyContent: 'center' }}>
                <EyeOff size={16} /> Hide Data
              </button>
              <button className={`btn ${stegoAction === 'Decode' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => {setStegoAction('Decode'); setStegoSecret(''); setError(null); setSuccess(null);}} style={{ flex: 1, justifyContent: 'center' }}>
                <Eye size={16} /> Extract Data
              </button>
            </div>

            <label className="tool-label">{stegoAction === 'Encode' ? 'SECRET MESSAGE TO HIDE' : 'EXTRACTED SECRET MESSAGE'}</label>
            <textarea 
              className="tool-input" 
              value={stegoSecret} 
              onChange={e => setStegoSecret(e.target.value)}
              readOnly={stegoAction === 'Decode'}
              placeholder={stegoAction === 'Encode' ? "Type a secret message here..." : "Extracted data will appear here..."}
              style={{ height: '150px', fontFamily: 'var(--font-mono)', marginBottom: '20px', color: stegoAction === 'Decode' ? 'var(--accent-green)' : 'inherit' }}
            />

            <button className="btn btn-primary" onClick={executeStego} style={{ width: '100%', justifyContent: 'center', marginBottom: '12px', background: stegoAction === 'Encode' ? 'var(--accent-blue)' : 'var(--accent-red)' }}>
              {stegoAction === 'Encode' ? <EyeOff size={16} /> : <Eye size={16} />} 
              {stegoAction === 'Encode' ? 'Inject Data into Pixels' : 'Crack Image Pixels'}
            </button>

            {stegoAction === 'Encode' && stegoImageSrc && success && (
              <button className="btn btn-ghost" onClick={downloadStegoImage} style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}>
                <Download size={16} /> Download Infected Image
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
