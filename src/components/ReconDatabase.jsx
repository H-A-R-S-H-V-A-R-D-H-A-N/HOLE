import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow, MiniMap, Controls, Background, addEdge,
  applyNodeChanges, applyEdgeChanges, Handle, Position, NodeResizer,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Database, Plus, Trash2, Edit3, X, Globe, Server, FileText, ExternalLink, Download, Upload, Zap, FolderOpen, Save, Maximize2, Minimize2, Shield, Lock, Key, Wifi, Cloud, Bug, Eye, Terminal, Hash, Link, AlertTriangle, Layers } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { saveToFile, openFile, readFileDirect } from '../utils/fileSystem';
import '../styles/Tools.css';

const typeIcons = {
  subdomain: Globe, ip: Server, url: ExternalLink, note: FileText, vuln: Zap,
  api: Cloud, auth: Lock, key: Key, network: Wifi, bug: Bug,
  recon: Eye, shell: Terminal, hash: Hash, link: Link, warning: AlertTriangle,
  shield: Shield, layer: Layers, database: Database, folder: FolderOpen
};
const typeColors = {
  subdomain: '#60A5FA', ip: '#F59E0B', url: '#10B981', note: '#8B95A8', vuln: '#EF4444',
  api: '#A78BFA', auth: '#F472B6', key: '#FBBF24', network: '#34D399', bug: '#FB7185',
  recon: '#38BDF8', shell: '#4ADE80', hash: '#C084FC', link: '#2DD4BF', warning: '#F97316',
  shield: '#818CF8', layer: '#94A3B8', database: '#8B5CF6', folder: '#D4D4D8'
};

const CustomNode = ({ data, selected }) => {
  const Icon = typeIcons[data.type?.toLowerCase()] || FileText;

  const getColor = (str) => {
    if (typeColors[str?.toLowerCase()]) return typeColors[str.toLowerCase()];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const color = `#${(hash & 0x00FFFFFF).toString(16).padStart(6, '0')}`;
    return color.length === 7 ? color : '#8B95A8';
  };

  const color = data.color || getColor(data.type || 'note');
  return (
    <div
      className={`recon-node ${selected ? 'recon-node-selected' : ''}`}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderLeft: `4px solid ${color}`,
        borderRadius: '8px',
        padding: '12px 16px',
        minWidth: '180px',
        boxShadow: selected ? `0 0 0 1px ${color}, 0 4px 20px rgba(0,0,0,0.4)` : '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, width: '10px', height: '10px', border: '2px solid var(--bg-deep)' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: color }}>
        <Icon size={14} />
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{data.type}</span>
      </div>
      
      <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, wordBreak: 'break-all' }}>
        {data.label}
      </div>
      
      {data.notes && (
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px', fontStyle: 'italic', wordBreak: 'break-word' }}>
          {data.notes}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={{ background: color, width: '10px', height: '10px', border: '2px solid var(--bg-deep)' }} />
    </div>
  );
};

const nodeTypes = { custom: CustomNode };

const defaultNodes = [];

export default function ReconDatabase({ storageDir, fsUpdateTrigger }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const reactFlowWrapper = useRef(null);
  const reactFlowInstance = useRef(null);
  // Workflow File Management
  const [workflows, setWorkflows] = useState([]);
  const [activeWorkflow, setActiveWorkflow] = useState('');
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [panelMode, setPanelMode] = useState('none');
  const [confirmState, setConfirmState] = useState(null);

  const [nodeForm, setNodeForm] = useState({ type: 'Subdomain', label: '', notes: '', inputs: 1, outputs: 1, color: '#3B82F6' });
  const [edgeForm, setEdgeForm] = useState({ label: 'Resolves To', color: '#10B981' });

  // Load available workflows from disk
  const loadAvailableWorkflows = useCallback(async () => {
    if (!storageDir || !window.electronAPI) return;
    try {
      const result = await window.electronAPI.listFiles({ dirPath: `${storageDir}\\Workflow`, extension: '.json' });
      if (result.success) {
        const wfFiles = result.files
          .filter(f => f.name.endsWith('.json'))
          .map(f => f.name.replace('.json', ''));
        setWorkflows(wfFiles);
        // Auto-select the first workflow if none is active
        if (wfFiles.length > 0 && !activeWorkflow) {
          setActiveWorkflow(wfFiles[0]);
        }
      } else {
        setWorkflows([]);
      }
    } catch (e) {
      setWorkflows([]);
    }
  }, [storageDir]);

  useEffect(() => {
    loadAvailableWorkflows();
  }, [loadAvailableWorkflows, fsUpdateTrigger]);

  const loadWorkflowData = useCallback(async (workflowName) => {
    if (!storageDir || !workflowName) return;
    setIsLoaded(false);
    const filePath = `${storageDir}\\Workflow\\${workflowName}.json`;
    try {
      const result = await readFileDirect(filePath);
      if (result.success) {
        const data = JSON.parse(result.content);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } else {
        setNodes([]);
        setEdges([]);
      }
    } catch (e) {
      setNodes([]);
      setEdges([]);
    }
    setIsLoaded(true);
  }, [storageDir]);

  useEffect(() => {
    if (activeWorkflow) {
      loadWorkflowData(activeWorkflow);
    } else {
      setNodes([]);
      setEdges([]);
      setIsLoaded(true);
    }
  }, [activeWorkflow, loadWorkflowData, fsUpdateTrigger]);

  const saveWorkflowData = async (currentNodes, currentEdges, workflowName) => {
    if (!storageDir || !window.electronAPI) return;
    setSaveStatus('saving');
    const path = `${storageDir}\\Workflow\\${workflowName}.json`;
    try {
      await window.electronAPI.saveFileDirect({
        filePath: path,
        content: JSON.stringify({ version: '1.0', nodes: currentNodes, edges: currentEdges }, null, 2)
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus('error');
    }
  };

  const handleCreateNewWorkflow = async () => {
    if (!newWorkflowName.trim()) return;
    const name = `Workflow_${newWorkflowName.trim().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    // Save an empty workflow file to disk immediately
    const filePath = `${storageDir}\\Workflow\\${name}.json`;
    try {
      await window.electronAPI.saveFileDirect({
        filePath,
        content: JSON.stringify({ version: '1.0', nodes: [], edges: [] }, null, 2)
      });
    } catch(e) { console.warn(e); }
    if (!workflows.includes(name)) {
      setWorkflows([...workflows, name]);
    }
    setActiveWorkflow(name);
    setShowNewWorkflow(false);
    setNewWorkflowName('');
  };

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 2 },
      label: 'Connected To',
      labelStyle: { fill: '#fff', fontSize: 12 },
      labelBgStyle: { fill: '#0A0E17', opacity: 0.8 },
    }, eds));
  }, []);

  const handleNodeClick = (_, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setNodeForm({ ...node.data });
    setPanelMode('editNode');
  };

  const handleEdgeClick = (_, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setEdgeForm({ label: edge.label || '', color: edge.style?.stroke || '#10B981' });
    setPanelMode('editEdge');
  };

  const handlePaneClick = () => {
    if (panelMode === 'editNode' || panelMode === 'editEdge') {
      setPanelMode('none');
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  };

  const saveNodeEdits = () => {
    if (selectedNode) {
      setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, ...nodeForm } } : n));
    }
    setPanelMode('none');
  };

  const saveEdgeEdits = () => {
    if (selectedEdge) {
      setEdges(edges.map(e => e.id === selectedEdge.id ? { ...e, label: edgeForm.label, style: { ...e.style, stroke: edgeForm.color } } : e));
    }
    setPanelMode('none');
  };

  const deleteSelected = () => {
    if (selectedNode) {
      setNodes(nodes.filter(n => n.id !== selectedNode.id));
      setEdges(edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    } else if (selectedEdge) {
      setEdges(edges.filter(e => e.id !== selectedEdge.id));
    }
    setPanelMode('none');
  };

  const addNewNode = () => {
    let position = { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100 };
    
    if (reactFlowInstance.current && reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const screenCenter = {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2
      };
      // project from screen to flow coords
      position = reactFlowInstance.current.screenToFlowPosition(screenCenter);
    }
    
    const newNode = {
      id: Date.now().toString(),
      type: 'custom',
      position,
      data: { type: 'Subdomain', label: 'new.target.com', notes: '', color: '#3B82F6' },
    };
    setNodes(prev => [...prev, newNode]);
  };

  const confirmClear = () => {
    setConfirmState({
      title: 'Clear Workflow',
      message: `Are you sure you want to clear ${activeWorkflow}? This cannot be undone.`,
      onConfirm: () => { setNodes([]); setEdges([]); setConfirmState(null); }
    });
  };

  const deleteWorkflow = () => {
    setConfirmState({
      title: 'Delete Workflow',
      message: `Are you sure you want to permanently delete "${activeWorkflow.replace('Workflow_', '')}"? This file will be removed from disk.`,
      onConfirm: async () => {
        const filePath = `${storageDir}\\Workflow\\${activeWorkflow}.json`;
        try {
          await window.electronAPI.deleteFile(filePath);
        } catch(e) { console.warn(e); }
        const remaining = workflows.filter(w => w !== activeWorkflow);
        setWorkflows(remaining);
        setActiveWorkflow(remaining.length > 0 ? remaining[0] : '');
        setNodes([]);
        setEdges([]);
        setConfirmState(null);
      }
    });
  };

  if (!isLoaded) return null;

  // No workflows exist — show empty state
  if (workflows.length === 0 && !showNewWorkflow) {
    return (
      <div className="tool-page page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 40px)', gap: '24px' }}>
        <Database size={64} color="#8B5CF6" style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>No Workflows Found</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '400px', textAlign: 'center' }}>You don't have any workflow maps yet. Create your first one to start mapping your recon data.</p>
        <button className="btn btn-primary" onClick={() => setShowNewWorkflow(true)} style={{ padding: '12px 32px', fontSize: '15px' }}>
          <Plus size={18} /> Create Workflow
        </button>
        {showNewWorkflow && null}
      </div>
    );
  }

  // Show only the create form if triggered from empty state
  if (workflows.length === 0 && showNewWorkflow) {
    return (
      <div className="tool-page page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 40px)', gap: '24px' }}>
        <Database size={64} color="#8B5CF6" style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>Create Your First Workflow</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            autoFocus
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            placeholder="e.g. target_name"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNewWorkflow()}
            style={{ padding: '10px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '15px', width: '280px' }}
          />
          <button className="btn btn-primary" onClick={handleCreateNewWorkflow}>Create</button>
          <button className="btn btn-ghost" onClick={() => setShowNewWorkflow(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`tool-page page-enter ${isFullscreen ? 'recon-fullscreen' : ''}`} style={isFullscreen ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'var(--bg-deep)', padding: 0, display: 'flex', flexDirection: 'column' } : { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', padding: 0 }}>
      {/* Top Header with Workflow Selection */}
      <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Database size={24} color="#8B5CF6" />
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Recon Database</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <select 
            value={activeWorkflow} 
            onChange={(e) => setActiveWorkflow(e.target.value)}
            style={{ padding: '8px 16px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontWeight: 600 }}
          >
            {workflows.map(wf => (
              <option key={wf} value={wf}>{wf.replace('Workflow_', '')}</option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={() => setShowNewWorkflow(true)} title="Create New Workflow">
            <Plus size={16} /> New Map
          </button>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          
          <button className="btn btn-primary" onClick={() => saveWorkflowData(nodes, edges, activeWorkflow)}>
            Save Workflow
          </button>
          
          {saveStatus && (
            <span style={{ fontSize: '12px', color: saveStatus === 'saved' ? '#10B981' : saveStatus === 'error' ? '#EF4444' : 'var(--text-muted)' }}>
              {saveStatus === 'saved' ? 'Saved' : 'Saving...'}
            </span>
          )}
          
          <button className="btn btn-primary btn-sm" onClick={addNewNode}><Plus size={14} /> Add Node</button>
          <button className="btn btn-ghost btn-sm" onClick={confirmClear} style={{ color: '#EF4444' }}><Trash2 size={14} /> Clear</button>
          <button className="btn btn-ghost btn-sm" onClick={deleteWorkflow} style={{ color: '#EF4444' }}><Trash2 size={14} /> Delete Map</button>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
          <button className="btn-icon" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {showNewWorkflow && (
        <div style={{ padding: '16px 24px', background: 'var(--bg-deep)', borderBottom: '1px solid var(--border-default)', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>NEW WORKFLOW:</span>
          <input 
            autoFocus
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            placeholder="e.g. target_name"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNewWorkflow()}
            style={{ padding: '6px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#fff', outline: 'none' }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleCreateNewWorkflow}>Create</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowNewWorkflow(false)}>Cancel</button>
        </div>
      )}

      {/* Main Flow Area */}
      <div style={{ flex: 1, position: 'relative' }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onInit={(instance) => reactFlowInstance.current = instance}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.1}
          maxZoom={4}
          style={{ background: 'var(--bg-deep)' }}
        >
          <Background color="var(--border-default)" gap={20} size={2} />
          <Controls style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} />
          <MiniMap 
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '8px' }} 
            nodeColor={(node) => node.data?.color || '#3B82F6'} 
            maskColor="rgba(0, 0, 0, 0.7)"
          />
        </ReactFlow>

        {/* Edit Panel */}
        {panelMode !== 'none' && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', width: '320px', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: '12px', padding: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                {panelMode === 'editNode' ? 'Edit Node' : 'Edit Connection'}
              </h3>
              <button className="btn-icon" onClick={() => setPanelMode('none')}><X size={16} /></button>
            </div>

            {panelMode === 'editNode' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="tool-label">Type / Category</label>
                  <input 
                    className="tool-input" 
                    list="node-type-suggestions"
                    value={nodeForm.type} 
                    onChange={(e) => setNodeForm({...nodeForm, type: e.target.value})}
                    placeholder="Type anything: Subdomain, API, Auth, etc."
                  />
                  <datalist id="node-type-suggestions">
                    {Object.keys(typeIcons).map(t => (
                      <option key={t} value={t.charAt(0).toUpperCase() + t.slice(1)} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="tool-label">Label (Domain, IP, etc.)</label>
                  <input className="tool-input" value={nodeForm.label} onChange={(e) => setNodeForm({...nodeForm, label: e.target.value})} />
                </div>
                <div>
                  <label className="tool-label">Notes (Markdown allowed)</label>
                  <textarea className="tool-textarea" value={nodeForm.notes} onChange={(e) => setNodeForm({...nodeForm, notes: e.target.value})} rows={3} />
                </div>
                <div>
                  <label className="tool-label">Custom Color</label>
                  <input type="color" value={nodeForm.color} onChange={(e) => setNodeForm({...nodeForm, color: e.target.value})} style={{ width: '100%', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <button className="btn btn-ghost" onClick={deleteSelected} style={{ color: '#EF4444' }}><Trash2 size={16} /> Delete</button>
                  <button className="btn btn-primary" onClick={saveNodeEdits}>Save Changes</button>
                </div>
              </div>
            )}

            {panelMode === 'editEdge' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="tool-label">Connection Label</label>
                  <input className="tool-input" value={edgeForm.label} onChange={(e) => setEdgeForm({...edgeForm, label: e.target.value})} />
                </div>
                <div>
                  <label className="tool-label">Line Color</label>
                  <input type="color" value={edgeForm.color} onChange={(e) => setEdgeForm({...edgeForm, color: e.target.value})} style={{ width: '100%', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <button className="btn btn-ghost" onClick={deleteSelected} style={{ color: '#EF4444' }}><Trash2 size={16} /> Delete</button>
                  <button className="btn btn-primary" onClick={saveEdgeEdits}>Save Changes</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmState && (
        <ConfirmModal 
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
