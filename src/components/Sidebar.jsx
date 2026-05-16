import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileEdit,
  Settings,
  DollarSign,
  Plus,
  FileText,
  Bookmark,
  Clock,
  Star,
  Trash2,
  Layers,
  Globe,
  ShieldAlert,
  Zap,
  Scan,
  Eye,
  EyeOff,
  Columns3,
  Timer,
  Binary,
  GitCompare,
  Camera,
  GitBranch,
  AtSign,
  Key,
  Database,
  Code2,
  Calculator,
  AlertTriangle,
  Target,
  X,
  Book,
  Shield,
  TerminalSquare,
  ShieldOff,
  Radio,
  Heart,
  Coffee,
  Crosshair
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import '../styles/Sidebar.css';

// Rich calming color palette — each sidebar item gets its own accent
const ITEM_COLORS = [
  '#E85D75', // rose
  '#D946EF', // fuchsia
  '#8B5CF6', // violet
  '#6366F1', // indigo
  '#3B82F6', // blue
  '#06B6D4', // cyan
  '#14B8A6', // teal
  '#10B981', // emerald
  '#F59E0B', // amber
  '#F97316', // orange
  '#EC4899', // pink
  '#A855F7', // purple
  '#2DD4BF', // aqua
  '#FB7185', // coral
  '#818CF8', // periwinkle
  '#34D399', // mint
  '#FBBF24', // gold
  '#F472B6', // blush
  '#60A5FA', // sky
  '#C084FC', // lavender
];

// Deterministic color for each item ID so it stays consistent
function getItemColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return ITEM_COLORS[Math.abs(hash) % ITEM_COLORS.length];
}

const navSections = [
  {
    title: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'editor', label: 'Editor', icon: FileEdit },
      { id: 'journal', label: 'Hacker Journal', icon: Book },
      { id: 'payloads', label: 'Payloads', icon: Layers },
      { id: 'resources', label: 'Resources', icon: Heart },
    ],
  },
  {
    title: 'Tools',
    items: [
      { id: 'methodology', label: 'Methodology', icon: GitBranch },
      { id: 'recondb', label: 'Workflow', icon: Database },
      { id: 'code-editor', label: 'Code Studio', icon: Code2 },
      { id: 'cvss-calculator', label: 'CVSS Calculator', icon: Calculator },
      { id: 'identity', label: 'Identity Gen', icon: AtSign },
      { id: 'auto-detect', label: 'Auto-Detect', icon: Scan },
      { id: 'encoder', label: 'Encoder/Decoder', icon: Binary },
      { id: 'diff', label: 'Diff Scope', icon: GitCompare },
      { id: 'annotator', label: 'Annotator', icon: Camera },
      { id: 'recon', label: 'Scope Manager', icon: Target },
      { id: 'parallel-reality', label: 'Context Vault', icon: GitCompare },
      { id: 'unknown-space', label: 'Unknown Space', icon: AlertTriangle },
      { id: 'kanban', label: 'Bug Kanban', icon: Columns3 },
      { id: 'timer', label: 'Time Tracker', icon: Timer },
      { id: 'bounty', label: 'Bounty Tracker', icon: DollarSign },
      { id: 'tor-mode', label: 'Tor Engine', icon: Shield },
      { id: 'terminal', label: 'Terminal', icon: TerminalSquare },
      { id: 'waf-evasion', label: 'WAF Bypass', icon: ShieldOff },
      { id: 'jwt-forger', label: 'JWT Forger', icon: Shield },
      { id: 'crypto-stego', label: 'Crypto & Stego', icon: Key },
      { id: 'graphql-visualizer', label: 'GraphQL Viz', icon: Database },
      { id: 'secret-sniper', label: 'Secret Sniper', icon: Crosshair },
      { id: 'cors-exploit', label: 'CORS Exploit', icon: Globe },
      { id: 'revshell', label: 'Rev Shell', icon: TerminalSquare },
    ],
  },
  {
    title: 'Notes',
    items: [
      { id: 'all-notes', label: 'All Notes', icon: FileText },
      { id: 'favorites', label: 'Favorites', icon: Bookmark },
      { id: 'important', label: 'Important', icon: Star },
      { id: 'recent', label: 'Recent', icon: Clock },
      { id: 'archived-notes', label: 'Archived', icon: Book },
    ],
  },
];

const holeLetters = ['H', 'O', 'L', 'E'];

export default function Sidebar({ activeView, onViewChange, notes, onNewNote, onSelectNote, onDeleteNote, customSections = [], privacyMode, setPrivacyMode }) {
  const [expandedSections, setExpandedSections] = useState({
    Main: true, Tools: true, Notes: true, Platforms: true, 'Custom Sections': true,
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const toggleSection = (title) => setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));

  const handleItemClick = (id) => {
    onViewChange(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm && onDeleteNote) onDeleteNote(deleteConfirm);
    setDeleteConfirm(null);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-container"><img src="/hole-icon.jpg" alt="HOLE" className="sidebar-logo" /></div>
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">{holeLetters.map((l, i) => <span key={i} className="kroma-letter">{l}</span>)}</span>
          <span className="sidebar-brand-tag">Bug Bounty Workstation</span>
        </div>
      </div>

      <button className="sidebar-new-btn" onClick={() => onNewNote('blank')}><Plus size={18} /> New Note</button>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div className="sidebar-section" key={section.title}>
            <div className="sidebar-section-title" onClick={() => toggleSection(section.title)} style={{ cursor: 'pointer' }}>
              {section.title}
            </div>
            {expandedSections[section.title] && section.items.map((item) => {
              const Icon = item.icon;
              const color = getItemColor(item.id);
              return (
                <div
                  key={item.id}
                  className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                  onClick={() => handleItemClick(item.id)}
                  style={{ '--item-accent': color }}
                >
                  <Icon size={18} className="sidebar-item-icon" />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        ))}

        {customSections.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Custom Sections</div>
            {customSections.map((s) => (
              <div key={s.id} className={`sidebar-item ${activeView === `section-${s.id}` ? 'active' : ''}`} onClick={() => onViewChange(`section-${s.id}`)}>
                <Layers size={18} className="sidebar-item-icon" style={{ color: s.color }} />
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">Saved Notes</div>
            {notes.map((note) => (
              <div key={note.id} className="sidebar-item sidebar-note-item" onClick={() => onSelectNote(note)}>
                <FileText size={16} className="sidebar-item-icon" />
                <span className="sidebar-note-title">{note.title || 'Untitled'}</span>
                <button className="note-delete-btn" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(note); }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-item" onClick={() => setPrivacyMode(!privacyMode)}>
          {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
          <span>Privacy Mode</span>
        </div>
        <div className={`sidebar-footer-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => onViewChange('settings')}>
          <Settings size={18} />
          <span>Settings</span>
        </div>
        <div className="sidebar-footer-item" onClick={() => onViewChange('support')} style={{ color: '#FFD700' }}>
          <Coffee size={18} />
          <span>About</span>
        </div>
      </div>

      {deleteConfirm && (
        <ConfirmModal
          title="Delete Note"
          message={`Are you sure you want to delete "${deleteConfirm.title}"?`}
          warning="This action cannot be undone."
          confirmText="Delete Note"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </aside>
  );
}
