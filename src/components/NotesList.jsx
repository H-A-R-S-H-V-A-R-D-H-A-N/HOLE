import { useState } from 'react';
import { Clock, Shield, Bookmark, Star, Edit, FileText, Layers, MoreVertical, Plus, Settings, Book, Trash2 } from 'lucide-react';
import '../styles/NotesList.css';

export default function NotesList({ 
  view, 
  notes, 
  searchQuery, 
  onSelectNote, 
  onUpdateNote, 
  onNewNote,
  onDeleteNote,
  customSections = [],
  onManageSections
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  let filteredNotes = notes;
  
  if (view === 'favorites') {
    filteredNotes = notes.filter(n => n.metadata?.isFavorite && !n.metadata?.isArchived);
  } else if (view === 'important') {
    filteredNotes = notes.filter(n => n.metadata?.isImportant && !n.metadata?.isArchived);
  } else if (view === 'recent') {
    // Already sorted by date in App.jsx (presumably, or we can sort here)
    filteredNotes = [...notes].filter(n => !n.metadata?.isArchived).sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0)).slice(0, 15);
  } else if (view.startsWith('section-')) {
    const sectionId = view.replace('section-', '');
    filteredNotes = notes.filter(n => n.metadata?.customSection === sectionId && !n.metadata?.isArchived);
  } else if (view === 'archived-notes') {
    filteredNotes = notes.filter(n => n.metadata?.isArchived);
  } else {
    // 'all-notes'
    filteredNotes = notes.filter(n => !n.metadata?.isArchived);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredNotes = filteredNotes.filter(n => 
      (n.title && n.title.toLowerCase().includes(q)) || 
      (n.html && n.html.toLowerCase().includes(q)) ||
      (n.metadata?.tags && n.metadata.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  const toggleFavorite = (e, note) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      metadata: { ...note.metadata, isFavorite: !note.metadata?.isFavorite }
    });
  };

  const toggleImportant = (e, note) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      metadata: { ...note.metadata, isImportant: !note.metadata?.isImportant }
    });
  };

  const toggleArchive = (e, note) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      metadata: { ...note.metadata, isArchived: !note.metadata?.isArchived }
    });
  };

  const assignSection = (e, note, sectionId) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      metadata: { ...note.metadata, customSection: sectionId === 'none' ? null : sectionId }
    });
    setActiveMenuId(null);
  };

  const getSectionColor = (sectionId) => {
    const section = customSections.find(s => s.id === sectionId);
    return section ? section.color : 'transparent';
  };

  const getSectionName = (sectionId) => {
    const section = customSections.find(s => s.id === sectionId);
    return section ? section.name : '';
  };

  const getTitle = () => {
    if (view === 'favorites') return { text: 'Favorites', icon: Bookmark };
    if (view === 'important') return { text: 'Important', icon: Star };
    if (view === 'recent') return { text: 'Recent Notes', icon: Clock };
    if (view === 'archived-notes') return { text: 'Archived Notes', icon: Book };
    if (view.startsWith('section-')) {
      const name = getSectionName(view.replace('section-', ''));
      return { text: name || 'Custom Section', icon: Layers };
    }
    return { text: 'All Notes', icon: FileText };
  };

  const titleInfo = getTitle();
  const TitleIcon = titleInfo.icon;

  return (
    <div className="notes-list-page">
      <div className="notes-list-header">
        <h1 className="notes-list-title">
          <TitleIcon size={24} style={view.startsWith('section-') ? { color: getSectionColor(view.replace('section-', '')) } : {}} />
          {titleInfo.text}
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {view === 'all-notes' && (
            <button className="btn btn-secondary" onClick={onManageSections}>
              <Settings size={16} /> Manage Sections
            </button>
          )}
          <button className="btn btn-primary" onClick={() => onNewNote('blank')}>
            <Plus size={16} /> New Note
          </button>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '100px' }}>
          <div className="empty-state-icon">
            <TitleIcon size={48} strokeWidth={1} />
          </div>
          <p className="empty-state-title">No notes found</p>
          <p className="empty-state-desc">
            {searchQuery 
              ? `No notes matching "${searchQuery}" in this view.` 
              : "You don't have any notes in this section yet."}
          </p>
        </div>
      ) : (
        <div className="notes-grid">
          {filteredNotes.map((note) => {
            const isFav = note.metadata?.isFavorite;
            const isImp = note.metadata?.isImportant;
            const sectionColor = note.metadata?.customSection ? getSectionColor(note.metadata.customSection) : 'transparent';
            
            // Extract a brief text preview from HTML
            const plainText = note.html ? note.html.replace(/<[^>]+>/g, '').substring(0, 150) : 'No content';

            return (
              <div 
                key={note.id} 
                className="note-card"
                onClick={() => onSelectNote(note, 'read')}
              >
                {/* Section Color Edge */}
                <div className="note-card-edge" style={{ backgroundColor: sectionColor }} />
                
                <div className="note-card-header">
                  <h3 className="note-card-title">{note.title || 'Untitled Note'}</h3>
                  <div className="note-card-actions">
                    <button 
                      className={`note-action-btn ${isImp ? 'active important' : ''}`}
                      onClick={(e) => toggleImportant(e, note)}
                      title="Mark as Important"
                    >
                      <Star size={16} fill={isImp ? "currentColor" : "none"} />
                    </button>
                    <button 
                      className={`note-action-btn ${isFav ? 'active favorite' : ''}`}
                      onClick={(e) => toggleFavorite(e, note)}
                      title="Mark as Favorite"
                    >
                      <Bookmark size={16} fill={isFav ? "currentColor" : "none"} />
                    </button>
                    <button 
                      className={`note-action-btn ${note.metadata?.isArchived ? 'active' : ''}`}
                      onClick={(e) => toggleArchive(e, note)}
                      title={note.metadata?.isArchived ? "Unarchive Note" : "Archive Note"}
                    >
                      <Book size={16} />
                    </button>
                    {onDeleteNote && (
                      <button 
                        className="note-action-btn"
                        onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                        title="Delete Note"
                        style={{ color: '#EF4444' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div style={{ position: 'relative' }}>
                      <button 
                        className="note-action-btn"
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === note.id ? null : note.id); }}
                        title="Move to section"
                      >
                        <Layers size={16} />
                      </button>
                      {activeMenuId === note.id && (
                        <div className="assign-menu" onClick={(e) => e.stopPropagation()}>
                          <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assign Section</div>
                          <button className="assign-menu-item" onClick={(e) => assignSection(e, note, 'none')}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid var(--border-strong)' }} />
                            None
                          </button>
                          {customSections.map(s => (
                            <button key={s.id} className="assign-menu-item" onClick={(e) => assignSection(e, note, s.id)}>
                              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: s.color }} />
                              {s.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="note-card-meta">
                  <div className="note-card-meta-item">
                    <Clock size={12} />
                    {note.savedAt ? new Date(note.savedAt).toLocaleDateString() : 'Just now'}
                  </div>
                  {note.metadata?.severity && (
                    <div className="note-card-meta-item">
                      <Shield size={12} />
                      <span style={{ textTransform: 'capitalize' }}>{note.metadata.severity}</span>
                    </div>
                  )}
                </div>

                <div className="note-card-preview">
                  {plainText}...
                </div>

                <div className="note-card-footer">
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {note.metadata?.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="badge badge-info" style={{ fontSize: '10px', padding: '2px 6px' }}>#{tag}</span>
                    ))}
                  </div>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={(e) => { e.stopPropagation(); onSelectNote(note, 'editor'); }}
                  >
                    <Edit size={14} /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
