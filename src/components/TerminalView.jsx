import { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, Plus, X } from 'lucide-react';
import TerminalInstance from './TerminalInstance';
import '../styles/Tools.css';

export default function TerminalView() {
  const [shells, setShells] = useState([]);
  const [tabs, setTabs] = useState([{ id: 'term-1', name: 'Terminal 1' }]);
  const [activeTabId, setActiveTabId] = useState('term-1');
  const [tabCounter, setTabCounter] = useState(2);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('terminal-fullscreen');
    } else {
      document.body.classList.remove('terminal-fullscreen');
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAvailableShells().then(res => {
        setShells(res);
      });
    }
  }, []);

  const addTab = () => {
    const newId = `term-${tabCounter}`;
    setTabs([...tabs, { id: newId, name: `Terminal ${tabCounter}` }]);
    setActiveTabId(newId);
    setTabCounter(tabCounter + 1);
  };

  const closeTab = (idToClose, e) => {
    e.stopPropagation();
    
    // Kill the underlying process explicitly to prevent zombie PTYs
    if (window.electronAPI) {
      window.electronAPI.ptyKill(idToClose);
    }

    const newTabs = tabs.filter(t => t.id !== idToClose);
    
    if (newTabs.length === 0) {
      // If closing the last tab, spawn a new one to keep the terminal usable
      const newId = `term-${tabCounter}`;
      setTabs([{ id: newId, name: `Terminal ${tabCounter}` }]);
      setActiveTabId(newId);
      setTabCounter(tabCounter + 1);
    } else {
      setTabs(newTabs);
      if (activeTabId === idToClose) {
        // If we closed the active tab, switch to the last available one
        setActiveTabId(newTabs[newTabs.length - 1].id);
      }
    }
  };

  const containerStyle = isFullscreen ? {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    display: 'flex', 
    flexDirection: 'column', 
    gap: '0px',
    padding: '24px',
    overflow: 'hidden'
  } : {
    display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', gap: '0px', overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(50px) saturate(180%)',
    WebkitBackdropFilter: 'blur(50px) saturate(180%)',
    padding: '24px',
    borderRadius: '24px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.4)'
  };

  return (
    <div className="tool-page macos-window-enter" style={containerStyle}>
      
      {/* Global Header & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TerminalIcon size={20} color="#fff" />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>TERMINAL</h2>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

        {/* Tab Bar */}
        <div style={{ display: 'flex', flex: 1, gap: '8px', overflowX: 'auto', paddingRight: '12px' }} className="custom-scrollbar">
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <div 
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
                  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                  background: isActive ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${isActive ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                  color: isActive ? '#A78BFA' : '#94A3B8',
                  transition: 'all 0.2s',
                  fontSize: '13px', fontWeight: 600
                }}
              >
                {tab.name}
                <button 
                  onClick={(e) => closeTab(tab.id, e)}
                  style={{ background: 'none', border: 'none', padding: '2px', color: 'inherit', cursor: 'pointer', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
          
          <button 
            onClick={addTab}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Render All Terminal Instances */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {tabs.map(tab => (
          <TerminalInstance 
            key={tab.id} 
            id={tab.id} 
            shells={shells}
            isActive={tab.id === activeTabId}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />
        ))}
      </div>

    </div>
  );
}
