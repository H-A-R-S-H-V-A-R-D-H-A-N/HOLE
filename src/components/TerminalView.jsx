import { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Settings, Trash2, Power, PowerOff, Shield, Maximize, Minimize } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import '../styles/Tools.css';

export default function TerminalView() {
  const [shells, setShells] = useState([]);
  const [activeShell, setActiveShell] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [useTor, setUseTor] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('terminal-fullscreen');
    } else {
      document.body.classList.remove('terminal-fullscreen');
    }
  }, [isFullscreen]);

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
      allowTransparency: true,
      theme: {
        background: 'transparent',
        foreground: '#e6e6e6',
        cursor: '#49aee6',
        selectionBackground: 'rgba(73, 174, 230, 0.3)',
        black: '#1f2229',
        red: '#d41919',
        green: '#5ebf5e',
        yellow: '#feea00',
        blue: '#A78BFA',
        magenta: '#ed4aab',
        cyan: '#38caba',
        white: '#e6e6e6',
        brightBlack: '#838991',
        brightRed: '#ef2929',
        brightGreen: '#8ae234',
        brightYellow: '#fce94f',
        brightBlue: '#8B5CF6',
        brightMagenta: '#c19c00',
        brightCyan: '#8cc4ff',
        brightWhite: '#ffffff'
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
        window.electronAPI.ptyWrite('main-terminal', data);
      }
    });

    // Handle resize using ResizeObserver to catch display:none -> block transitions
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current && terminalRef.current && terminalRef.current.offsetParent !== null) {
        fitAddonRef.current.fit();
        if (window.electronAPI) {
          window.electronAPI.ptyResize('main-terminal', { cols: xtermRef.current.cols, rows: xtermRef.current.rows });
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
        window.electronAPI.ptyKill('main-terminal');
      }
    };
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    
    const ptyId = 'main-terminal';

    window.electronAPI.onPtyData(ptyId, (data) => {
      if (xtermRef.current) {
        xtermRef.current.write(data);
      }
    });

    window.electronAPI.onPtyExit(ptyId, (data) => {
      setIsRunning(false);
      if (xtermRef.current) {
        xtermRef.current.writeln('\r\n' + String.fromCharCode(27) + '[1;31m[Process Exited]' + String.fromCharCode(27) + '[0m');
      }
    });

    return () => {
      window.electronAPI.offPtyData(ptyId);
      window.electronAPI.offPtyExit(ptyId);
    };
  }, []);

  const startTerminal = async () => {
    if (!activeShell || !window.electronAPI) return;
    
    xtermRef.current.clear();
    xtermRef.current.writeln(String.fromCharCode(27) + '[1;34m[*] Spawning shell...' + String.fromCharCode(27) + '[0m');
    
    const res = await window.electronAPI.ptyStart({
      id: 'main-terminal',
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
    await window.electronAPI.ptyKill('main-terminal');
    setIsRunning(false);
    xtermRef.current.writeln('\r\n' + String.fromCharCode(27) + '[1;33m[Process Terminated by User]' + String.fromCharCode(27) + '[0m');
  };

  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };
  const containerStyle = isFullscreen ? {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    background: 'rgba(5, 10, 20, 0.85)',
    backdropFilter: 'blur(30px)',
    display: 'flex', 
    flexDirection: 'column', 
    gap: '20px', 
    padding: '24px', 
    overflow: 'hidden'
  } : { 
    display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', gap: '16px', overflow: 'hidden' 
  };

  return (
    <div className="tool-page macos-window-enter luxury-bg-animation" style={containerStyle}>
      {/* Header & Controls */}
      <div className="macos-glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '20px', flexShrink: 0, zIndex: 10, background: 'linear-gradient(135deg, #BE123C, #881337) !important', boxShadow: '0 10px 40px rgba(159, 18, 57, 0.4) !important', border: '1px solid rgba(255, 255, 255, 0.1) !important' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(0, 0, 0, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TerminalIcon size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '0.5px' }}>TERMINAL</h2>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 0, 0, 0.3)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <input type="checkbox" id="useTor" checked={useTor} onChange={(e) => setUseTor(e.target.checked)} disabled={isRunning} style={{ cursor: isRunning ? 'not-allowed' : 'pointer', accentColor: '#8B5CF6' }} />
            <label htmlFor="useTor" style={{ fontSize: '13px', fontWeight: 700, color: useTor ? '#A78BFA' : 'var(--text-muted)', cursor: isRunning ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={14} /> Tor Node
            </label>
          </div>

          <select 
            value={activeShell} 
            onChange={(e) => setActiveShell(e.target.value)}
            disabled={isRunning}
            style={{ padding: '8px 12px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', color: '#E2E8F0', fontSize: '13px', fontWeight: 600, outline: 'none' }}
          >
            {shells.map((s, i) => <option key={i} value={s.path}>{s.name}</option>)}
          </select>

          {isRunning ? (
            <button onClick={killTerminal} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(239, 68, 68, 0.15)', color: '#FCA5A5', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
              <PowerOff size={16} /> Disconnect
            </button>
          ) : (
            <button onClick={startTerminal} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(0, 0, 0, 0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', position: 'relative', zIndex: 10 }}>
              <Power size={16} /> Initialize
            </button>
          )}

          <button onClick={() => setIsFullscreen(!isFullscreen)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'rgba(0, 0, 0, 0.3)', color: 'var(--text-secondary)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>

          <button onClick={clearTerminal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'rgba(0, 0, 0, 0.3)', color: 'var(--text-secondary)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div style={{ flex: 1, padding: '16px', overflow: 'hidden', borderRadius: '20px', zIndex: 5, background: '#000000', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)' }}>
        <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
