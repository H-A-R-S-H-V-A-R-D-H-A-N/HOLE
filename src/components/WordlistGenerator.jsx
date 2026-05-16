import React, { useState } from 'react';
import { FileText, Link, Shield, Save, RefreshCw, Layers, CheckCircle } from 'lucide-react';

export default function WordlistGenerator() {
  const [url, setUrl] = useState('');
  const [useTor, setUseTor] = useState(false);
  const [doPermutations, setDoPermutations] = useState(true);
  const [minLength, setMinLength] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setResult(null);

    let target = url.trim();
    if (!target.startsWith('http')) target = 'http://' + target;

    const res = await window.electronAPI.generateWordlist({
      url: target,
      useTor,
      doPermutations,
      minLength: Number(minLength)
    });

    if (res.success) {
      setResult(res);
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  const handleExport = async () => {
    if (!result || !result.words) return;
    const res = await window.electronAPI.exportWordlist(result.words);
    if (res.success) {
      alert(`Wordlist exported successfully to:\\n${res.path}`);
    } else if (!res.canceled) {
      alert(`Export failed: ${res.error}`);
    }
  };

  return (
    <div className="tool-page page-enter" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', gap: '24px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #EC4899, #BE185D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 25px rgba(236, 72, 153, 0.3)' }}>
          <FileText size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Wordlist Generator</h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Context-Aware Target Scraping & Permutation Engine</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Settings Panel */}
        <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#EC4899" /> Extraction Config
            </h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Target URL</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#000', border: '1px solid var(--border-default)', borderRadius: '8px', padding: '0 12px' }}>
                <Link size={14} color="var(--text-muted)" />
                <input 
                  type="text" 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  placeholder="https://example.com"
                  style={{ width: '100%', padding: '12px 10px', background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#000', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} color={useTor ? '#10B981' : 'var(--text-muted)'} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Route via Tor Proxy</span>
              </div>
              <input type="checkbox" checked={useTor} onChange={(e) => setUseTor(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#000', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={16} color={doPermutations ? '#EC4899' : 'var(--text-muted)'} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Generate Permutations</span>
              </div>
              <input type="checkbox" checked={doPermutations} onChange={(e) => setDoPermutations(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Min Word Length</label>
              <input 
                type="number" 
                value={minLength} 
                onChange={(e) => setMinLength(e.target.value)} 
                min="3" max="10"
                style={{ width: '100%', padding: '10px 12px', background: '#000', border: '1px solid var(--border-default)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <button 
              onClick={handleGenerate} 
              disabled={loading || !url}
              style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #EC4899, #BE185D)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: loading || !url ? 'not-allowed' : 'pointer', opacity: loading || !url ? 0.6 : 1, marginTop: '8px' }}
            >
              {loading ? 'Scraping & Generating...' : 'Generate Wordlist'}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {error && (
            <div style={{ background: '#EF444420', border: '1px solid #EF444440', borderRadius: '12px', padding: '16px', color: '#EF4444', fontSize: '13px', lineHeight: 1.5 }}>
              <strong>Engine Error:</strong><br />{error}
            </div>
          )}

          {result && (
            <>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Unique Words Generated</span>
                    <span style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>{result.count.toLocaleString()}</span>
                  </div>
                  <CheckCircle size={32} color="#10B981" opacity={0.5} />
                </div>
                
                <button 
                  onClick={handleExport}
                  style={{ flex: 1, background: '#10B98115', border: '1px solid #10B98130', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <Save size={24} color="#10B981" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>Export to .txt File</span>
                </button>
              </div>

              <div style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>Preview (First 200 words)</h4>
                <div style={{ flex: 1, background: '#000', borderRadius: '8px', padding: '12px', overflowY: 'auto', maxHeight: '400px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start' }}>
                  {result.words.slice(0, 200).map((w, i) => (
                    <span key={i} style={{ background: '#374151', color: '#D1D5DB', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                      {w}
                    </span>
                  ))}
                  {result.count > 200 && (
                    <span style={{ background: 'transparent', color: 'var(--text-muted)', padding: '4px 8px', fontSize: '12px', fontStyle: 'italic' }}>
                      + {result.count - 200} more words...
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {!result && !error && !loading && (
            <div style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px dashed var(--border-default)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', opacity: 0.5 }}>
              <Layers size={48} color="var(--text-muted)" />
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>Enter a URL to generate a custom wordlist</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
