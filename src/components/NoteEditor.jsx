import { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { common, createLowlight } from 'lowlight';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Quote, Code, Code2, Minus,
  Link as LinkIcon, Unlink,
  Highlighter, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight,
  Table as TableIcon, Save, FolderOpen,
  Download, FileText, X, Palette,
  Copy, CheckCheck, BookOpen, Globe, Image as ImageIcon
} from 'lucide-react';
import { saveToFile, openFile, htmlToMarkdown, createNoteExport, parseNoteImport, saveMedia } from '../utils/fileSystem';
import PromptModal from './PromptModal';
import '../styles/Editor.css';

const lowlight = createLowlight(common);

const highlightColors = [
  { name: 'Yellow', color: '#F59E0B', dataColor: 'yellow' },
  { name: 'Green', color: '#10B981', dataColor: 'green' },
  { name: 'Red', color: '#EF4444', dataColor: 'red' },
  { name: 'Blue', color: '#3B82F6', dataColor: 'blue' },
  { name: 'Purple', color: '#8B5CF6', dataColor: 'purple' },
];

export default function NoteEditor({ initialId, initialContent, initialTitle, initialMeta, onSaveNote, settings }) {
  const [title, setTitle] = useState(initialTitle || '');
  const [severity, setSeverity] = useState(initialMeta?.severity || 'info');
  const [tags, setTags] = useState(initialMeta?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showHighlightColors, setShowHighlightColors] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const linkInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [promptState, setPromptState] = useState(null);
  const noteIdRef = useRef(initialId || Date.now().toString());

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
        bold: {},
        italic: {},
        strike: {},

        link: false,
        underline: false,
      }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({
        placeholder: 'Start writing your notes... Use the toolbar above for formatting.',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      TiptapImage.configure({ inline: true, allowBase64: true }),
    ],
    content: initialContent || '<p></p>',
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
      setCharCount(text.length);
    },
    editorProps: {
      handleClick: (view, pos, event) => {

        const link = event.target.closest('a');
        if (link && link.href) {
          event.preventDefault();
          window.open(link.href, '_blank', 'noopener,noreferrer');
          return true;
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const { schema } = view.state;
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
              const node = schema.nodes.image.create({ src: readerEvent.target.result });
              const transaction = view.state.tr.insert(coordinates.pos, node);
              view.dispatch(transaction);
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && initialContent) {
      if (typeof initialContent === 'string') {
        editor.commands.setContent(initialContent);
      } else {
        editor.commands.setContent(initialContent);
      }
    }
  }, [initialContent, editor]);

  useEffect(() => {
    if (initialTitle !== undefined) setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (initialMeta) {
      setSeverity(initialMeta.severity || 'info');
      setTags(initialMeta.tags || []);
    }
  }, [initialMeta]);



  const handleSave = useCallback(async (format = 'json') => {
    if (!editor) return;
    setSaveStatus('saving');

    let content, filename;
    if (format === 'md') {
      content = htmlToMarkdown(editor.getHTML());
      filename = `${(title || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    } else if (format === 'html') {
      content = `<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Inter,sans-serif;background:#0A0E17;color:#E8ECF4;padding:40px;max-width:800px;margin:0 auto}pre{background:#0D1117;padding:16px;border-radius:10px;border:1px solid #1B2332;overflow-x:auto}code{font-family:'JetBrains Mono',monospace}a{color:#00D4FF}mark{background:rgba(245,158,11,0.3);color:#FCD34D;padding:1px 4px;border-radius:3px}blockquote{border-left:3px solid #8B5CF6;padding:8px 24px;background:rgba(139,92,246,0.15);border-radius:0 10px 10px 0}</style></head><body>${editor.getHTML()}</body></html>`;
      filename = `${(title || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    } else {
      content = createNoteExport(title, editor.getJSON(), editor.getHTML(), { severity, tags });
      filename = `${(title || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${noteIdRef.current}.json`;
    }

    // Save directly to /Notes folder — no OS dialog
    const dir = localStorage.getItem('kroma_storage_dir');
    if (dir && window.electronAPI) {
      const filePath = `${dir}/Notes/${filename}`;
      const result = await window.electronAPI.saveFileDirect({ filePath, content });
      if (result.success) {
        setSaveStatus('saved');
        if (onSaveNote) {
          onSaveNote({
            id: noteIdRef.current,
            title: title || 'Untitled',
            content: editor.getJSON(),
            html: editor.getHTML(),
            metadata: initialMeta || {},
            severity,
            tags,
            savedAt: new Date().toISOString(),
            filePath: filePath,
          });
        }
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } else {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [editor, title, severity, tags, onSaveNote, initialId, initialMeta]);

  const handleSaveRef = useRef();
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  // Open file
  const handleOpen = useCallback(async () => {
    const result = await openFile();
    if (result.success) {
      if (result.name.endsWith('.json')) {
        const parsed = parseNoteImport(result.content);
        if (parsed.success) {
          editor.commands.setContent(parsed.data.content);
          setTitle(parsed.data.title || '');
          setSeverity(parsed.data.metadata?.severity || 'info');
          setTags(parsed.data.metadata?.tags || []);
          return;
        }
      }
      // For .md, .html, .txt — set as HTML or plain text
      if (result.name.endsWith('.html')) {
        editor.commands.setContent(result.content);
      } else {
        // Wrap plain text/markdown in paragraphs
        const lines = result.content.split('\n');
        const html = lines.map(l => `<p>${l || '<br>'}</p>`).join('');
        editor.commands.setContent(html);
      }
      setTitle(result.name.replace(/\.[^.]+$/, ''));
    }
  }, [editor]);

  // Add tag
  const handleAddTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const tag = tagInput.trim().toLowerCase().replace(/^#/, '');
      if (!tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput('');
    }
  };

  // Set link
  const handleSetLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      let url = linkUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const insertTemplate = (type) => {
    if (!editor) return;
    if (type === 'owasp') {
      const owaspTemplate = `
        <h2>OWASP Top 10 Checklist</h2>
        <ul data-type="taskList">
          <li data-type="taskItem" data-checked="false"><p><strong>A01: Broken Access Control</strong> - Test IDORs, path traversal, privilege escalation.</p></li>
          <li data-type="taskItem" data-checked="false"><p><strong>A02: Cryptographic Failures</strong> - Test weak encryption, sensitive data exposure, missing HTTPS.</p></li>
          <li data-type="taskItem" data-checked="false"><p><strong>A03: Injection</strong> - Test SQLi, XSS, OS Command Injection.</p></li>
          <li data-type="taskItem" data-checked="false"><p><strong>A04: Insecure Design</strong> - Test business logic flaws.</p></li>
          <li data-type="taskItem" data-checked="false"><p><strong>A05: Security Misconfiguration</strong> - Test default credentials, open directories, error messages.</p></li>
          <li data-type="taskItem" data-checked="false"><p><strong>A06: Vulnerable and Outdated Components</strong> - Check software versions, run Retire.js.</p></li>
          <li data-type="taskItem" data-checked="false"><p><strong>A07: Identification and Authentication Failures</strong> - Test weak passwords, 2FA bypass, session fixation.</p></li>
          <li data-type="taskItem" data-checked="false"><p><strong>A08: Software and Data Integrity Failures</strong> - Test insecure deserialization, unsigned firmware.</p></li>
          <li data-type="taskItem" data-checked="false"><p><strong>A09: Security Logging and Monitoring Failures</strong> - Check if critical actions generate logs (hard to test blackbox).</p></li>
          <li data-type="taskItem" data-checked="false"><p><strong>A10: Server-Side Request Forgery (SSRF)</strong> - Test webhook URLs, metadata endpoints.</p></li>
        </ul>
        <p></p>
      `;
      editor.commands.insertContent(owaspTemplate);
    }
  };


  const handleInsertImage = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        if (editor) {
          editor.chain().focus().setImage({ src: readerEvent.target.result }).run();
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  if (!editor) return null;

  return (
    <div className="editor-page">
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={onFileSelected} />
      {/* Header */}
      <div className="editor-header">
        <div className="editor-header-left">
          <input
            className="editor-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note..."
          />
        </div>
        <div className="editor-header-actions">

          <button className="btn btn-ghost btn-sm" onClick={() => insertTemplate('owasp')} title="Insert OWASP Top 10 Checklist">
            <BookOpen size={16} /> OWASP Template
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleOpen} title="Open File">
            <FolderOpen size={16} /> Open
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn btn-primary btn-sm" onClick={() => handleSave('json')} title="Save as KROMA JSON">
              <Save size={16} />
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
            </button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => handleSave('md')} title="Export as Markdown">
            <Download size={14} /> .md
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleSave('html')} title="Export as HTML">
            <Download size={14} /> .html
          </button>
        </div>
      </div>

      {/* Meta Row */}
      <div className="editor-meta">
        <div className="editor-meta-item">
          <span>Severity:</span>
          <select
            className="severity-select"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
            <option value="info">🔵 Info</option>
          </select>
        </div>
        <div className="editor-meta-item">
          <span>Tags:</span>
          <div className="tag-input-container">
            {tags.map((tag) => (
              <span key={tag} className="tag-pill">
                #{tag}
                <span className="tag-pill-remove" onClick={() => setTags(tags.filter(t => t !== tag))}>
                  <X size={12} />
                </span>
              </span>
            ))}
            <input
              className="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag..."
            />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
            <Undo2 size={18} />
          </button>
          <button className="toolbar-btn" onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">
            <Redo2 size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
            <Heading1 size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
            <Heading2 size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
            <Heading3 size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
            <Bold size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
            <Italic size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive('underline') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
            <UnderlineIcon size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive('strike') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Highlight with color picker */}
        <div className="toolbar-group">
          <div className="highlight-dropdown">
            <button
              className={`toolbar-btn ${editor.isActive('highlight') ? 'active' : ''}`}
              onClick={() => setShowHighlightColors(!showHighlightColors)}
              title="Highlight"
            >
              <Highlighter size={18} />
            </button>
            {showHighlightColors && (
              <div className="highlight-colors">
                {highlightColors.map(({ name, color, dataColor }) => (
                  <button
                    key={dataColor}
                    className="highlight-color-btn"
                    style={{ backgroundColor: color }}
                    title={name}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: dataColor }).run();
                      setShowHighlightColors(false);
                    }}
                  />
                ))}
                <button
                  className="highlight-color-btn"
                  style={{ backgroundColor: 'transparent', border: '2px solid var(--text-muted)' }}
                  title="Remove Highlight"
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run();
                    setShowHighlightColors(false);
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
            <List size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
            <ListOrdered size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive('taskList') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleTaskList().run()} title="Task List">
            <ListChecks size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className={`toolbar-btn ${editor.isActive('blockquote') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
            <Quote size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleCode().run()} title="Inline Code">
            <Code size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive('codeBlock') ? 'active' : ''}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
            <Code2 size={18} />
          </button>
          <button className="toolbar-btn" onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
            <Minus size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className={`toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}
            onClick={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run();
              } else {
                setShowLinkInput(!showLinkInput);
                setTimeout(() => linkInputRef.current?.focus(), 100);
              }
            }} title="Insert Link">
            {editor.isActive('link') ? <Unlink size={18} /> : <LinkIcon size={18} />}
          </button>
          <button className="toolbar-btn" onClick={handleInsertImage} title="Insert Image">
            <ImageIcon size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
            <AlignLeft size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
            <AlignCenter size={18} />
          </button>
          <button className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`}
            onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">
            <AlignRight size={18} />
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={() => {
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          }} title="Insert Table">
            <TableIcon size={18} />
          </button>
        </div>
      </div>

      {/* Link Input Popover */}
      {showLinkInput && (
        <div style={{
          display: 'flex', gap: '8px', padding: '8px 12px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)',
          animation: 'scaleIn 150ms ease-out',
        }}>
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetLink()}
            placeholder="https://example.com"
            style={{ flex: 1, fontSize: '13px' }}
          />
          <button className="btn btn-primary btn-sm" onClick={handleSetLink}>
            <LinkIcon size={14} /> Set Link
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowLinkInput(false); setLinkUrl(''); }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div 
        className="editor-content-wrapper"
        style={{ 
          fontSize: `${settings?.fontSize || 15}px`, 
          lineHeight: settings?.lineHeight || 1.8,
          fontFamily: settings?.editorFont || 'Inter, sans-serif'
        }}
        spellCheck={settings?.spellCheck ?? true}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Footer */}
      <div className="editor-footer">
        <div className="editor-footer-left">
          {settings?.showWordCount !== false && (
            <>
              <span>{wordCount} words</span>
              <span>{charCount} characters</span>
            </>
          )}
        </div>
        <div className="editor-footer-right">
        </div>
      </div>

      {promptState && (
        <PromptModal
          title={promptState.title}
          message={promptState.message}
          defaultValue={promptState.defaultValue}
          onConfirm={promptState.onConfirm}
          onCancel={() => setPromptState(null)}
        />
      )}
    </div>
  );
}
