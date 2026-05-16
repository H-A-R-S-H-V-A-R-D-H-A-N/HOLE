import { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Settings, Trash2, Power, PowerOff, Shield } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import '../styles/Tools.css';

export default function TerminalView() {
  const [shells, setShells] = useState([]);
  const [activeShell, setActiveShell] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [useTor, setUseTor] = useState(false);
  
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    // Fetch available shells
    if (window.electronAPI) {
      window.electronAPI.getAvailableShells().then(res => {
        setShells(res);
        if (res.length > 0) setActiveShell(res[0].path);
      });
    }

    // Initialize Xterm.js
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#10B981', // Hacker green
        cursor: '#10B981',
        selectionBackground: 'rgba(16, 185, 129, 0.4)'
      },
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      scrollback: 5000
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();
    
    term.writeln(String.fromCharCode(27) + '[1;32mWelcome to HOLE Integrated Terminal.' + String.fromCharCode(27) + '[0m');
    term.writeln('Select a shell environment to connect.');
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle input (typing into terminal sends to backend)
    term.onData(data => {
      if (window.electronAPI) {
        window.electronAPI.ptyWrite(data);
      }
    });

    // Handle resize using ResizeObserver to catch display:none -> block transitions
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current && terminalRef.current && terminalRef.current.offsetParent !== null) {
        fitAddonRef.current.fit();
        if (window.electronAPI) {
          window.electronAPI.ptyResize({ cols: xtermRef.current.cols, rows: xtermRef.current.rows });
        }
      }
    });
    
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      if (window.electronAPI) {
        window.electronAPI.ptyKill();
      }
    };
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    
    window.electronAPI.onPtyData((data) => {
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    });

    window.electronAPI.onPtyExit((data) => {
      setIsRunning(false);
      if (xtermRef.current) {
        xtermRef.current.writeln('\r\n' + String.fromCharCode(27) + '[1;31m[Process Exited]' + String.fromCharCode(27) + '[0m');
      }
    });

    return () => {
      window.electronAPI.offPtyData();
      window.electronAPI.offPtyExit();
    };
  }, []);

  const startTerminal = async () => {
    if (!activeShell || !window.electronAPI) return;
    
    xtermRef.current.clear();
    xtermRef.current.writeln(String.fromCharCode(27) + '[1;34m[*] Spawning shell...' + String.fromCharCode(27) + '[0m');
    
    const res = await window.electronAPI.ptyStart({
      shellPath: activeShell,
      cols: xtermRef.current.cols,
      rows: xtermRef.current.rows,
      useTor: useTor
    });

    if (res.success) {
      setIsRunning(true);
      if (useTor) {
        xtermRef.current.writeln(String.fromCharCode(27) + '[1;35m[*] Tor proxy variables injected (ALL_PROXY=socks5h://127.0.0.1:9050)' + String.fromCharCode(27) + '[0m');
      }
    } else {
      xtermRef.current.writeln('\r\n' + String.fromCharCode(27) + '[1;31m[Error] Failed to spawn shell: ' + res.error + String.fromCharCode(27) + '[0m');
    }
  };

  const killTerminal = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.ptyKill();
    setIsRunning(false);
    xtermRef.current.writeln('\r\n' + String.fromCharCode(27) + '[1;33m[Process Terminated by User]' + String.fromCharCode(27) + '[0m');
  };

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  return (
    <div className="tool-page page-enter" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', gap: '16px', overflow: 'hidden' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-default)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #14B8A6, #0D9488)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TerminalIcon size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Terminal</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Integrated command-line environment</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#000', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
            <input type="checkbox" id="useTor" checked={useTor} onChange={(e) => setUseTor(e.target.checked)} disabled={isRunning} style={{ cursor: isRunning ? 'not-allowed' : 'pointer' }} />
            <label htmlFor="useTor" style={{ fontSize: '13px', fontWeight: 700, color: useTor ? '#10B981' : 'var(--text-muted)', cursor: isRunning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={14} /> Inject Tor Proxy
            </label>
          </div>

          <select 
            value={activeShell} 
            onChange={(e) => setActiveShell(e.target.value)}
            disabled={isRunning}
            style={{ padding: '8px 12px', background: '#000', border: '1px solid var(--border-default)', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, outline: 'none' }}
          >
            {shells.map((s, i) => <option key={i} value={s.path}>{s.name}</option>)}
          </select>

          {isRunning ? (
            <button onClick={killTerminal} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#EF444420', color: '#EF4444', border: '1px solid #EF444440', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              <PowerOff size={16} /> Kill Process
            </button>
          ) : (
            <button onClick={startTerminal} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              <Power size={16} /> Connect
            </button>
          )}

          <button onClick={clearTerminal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'var(--bg-deep)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: '8px', cursor: 'pointer' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div style={{ flex: 1, background: '#000', borderRadius: '12px', border: '1px solid var(--border-default)', padding: '8px', overflow: 'hidden' }}>
        <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
