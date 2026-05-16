import { Clock, Shield, Tag, Bookmark, Star } from 'lucide-react';
import '../styles/Editor.css';

export default function NoteReader({ note }) {
  if (!note) return null;

  const metadata = note.metadata || {};
  const tags = metadata.tags || note.tags || [];
  const severity = metadata.severity || note.severity || 'info';

  return (
    <div className="editor-page page-enter">
      <div className="editor-header">
        <div className="editor-header-left">
          <h1 className="editor-title-input" style={{ pointerEvents: 'none' }}>
            {note.title || 'Untitled Note'}
          </h1>
        </div>
      </div>

      <div className="editor-meta">
        <div className="editor-meta-item">
          <Clock size={14} />
          {note.savedAt ? new Date(note.savedAt).toLocaleDateString() : new Date().toLocaleDateString()}
        </div>
        
        <div className="editor-meta-item">
          <Shield size={14} />
          <span className={`badge badge-${severity}`}>
            {severity.toUpperCase()}
          </span>
        </div>

        {tags.length > 0 && (
          <div className="editor-meta-item tag-input-container">
            <Tag size={14} />
            {tags.map((tag, i) => (
              <span key={i} className="tag-pill">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {metadata.isImportant && (
          <div className="editor-meta-item" style={{ color: '#EF4444', fontWeight: 600 }}>
            <Star size={14} fill="#EF4444" /> Important
          </div>
        )}

        {metadata.isFavorite && (
          <div className="editor-meta-item" style={{ color: '#10B981', fontWeight: 600 }}>
            <Bookmark size={14} fill="#10B981" /> Favorite
          </div>
        )}
      </div>

      <div className="editor-content-wrapper" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div 
          className="tiptap" 
          dangerouslySetInnerHTML={{ __html: note.html || '<p>No content available.</p>' }} 
        />
      </div>
    </div>
  );
}
