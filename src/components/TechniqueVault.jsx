import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Save, Trash2, Edit3, X, ChevronRight, Copy, CheckCircle2, BookOpen, Clock, Search, LayoutGrid, FolderPlus, AlertCircle, Hash, Code2, TerminalSquare, Maximize2, Minimize2 } from 'lucide-react';
import { getStorageDir } from '../utils/fileSystem';

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const EMJ = ['🔓','🔢','🌐','💉','🗄️','💀','📁','🔄','↗️','🧠','🔌','⬆️','📋','📝','🛡️','🔥','⚡','🎯','🔍'];

export default function TechniqueVault() {
  const [data, setData] = useState({});
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState('');
  
  // Custom Category State
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ id: '', name: '', emoji: '🛡️', color: '#8B5CF6' });
  
  // Technique State
  const [showTechForm, setShowTechForm] = useState(false);
  const [editingTechId, setEditingTechId] = useState(null);
  const [techForm, setTechForm] = useState({ title: '', description: '', steps: '', payloads: '', tags: '', notes: '' });
  
  // Full-Screen Viewer State
  const [activeTechnique, setActiveTechnique] = useState(null);
  const [viewerAnim, setViewerAnim] = useState(false);
  const [isViewerFullscreen, setIsViewerFullscreen] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');
  const formRef = useRef(null);
  const viewerRef = useRef(null);

  const toggleViewerFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().then(() => setIsViewerFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsViewerFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsViewerFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const storageDir = getStorageDir();
    if (!storageDir) return;
    try {
      const r = await window.electronAPI.techniquesLoad({ storageDir });
      if (r.success) {
        setData(r.data || {});
        setCategories(r.categories || []);
        if (!activeCat && r.categories?.length > 0) {
          setActiveCat(r.categories[0].id);
        }
      }
    } catch (e) { console.error(e); }
  };

  // ---- Category Management ---- //
  const openCatForm = (cat = null) => {
    if (cat) setCatForm({ ...cat });
    else setCatForm({ id: genId(), name: '', emoji: '🛡️', color: '#8B5CF6' });
    setShowCatForm(true);
  };

  const saveCategory = async () => {
    if (!catForm.name.trim()) return;
    const storageDir = getStorageDir();
    if (!storageDir) return;
    
    let nextCats = [...categories];
    const existing = nextCats.findIndex(c => c.id === catForm.id);
    if (existing >= 0) nextCats[existing] = catForm;
    else nextCats.push(catForm);
    
    setCategories(nextCats);
    setShowCatForm(false);
    if (!activeCat) setActiveCat(catForm.id);
    
    await window.electronAPI.categorySave({ storageDir, categories: nextCats });
  };

  const deleteCategory = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure? This will permanently delete this category and ALL techniques inside it.")) return;
    
    const storageDir = getStorageDir();
    const nextCats = categories.filter(c => c.id !== id);
    setCategories(nextCats);
    if (activeCat === id) setActiveCat(nextCats.length ? nextCats[0].id : null);
    
    await window.electronAPI.categoryDelete({ storageDir, categoryId: id, categories: nextCats });
    await loadData(); 
  };

  // ---- Technique Management ---- //
  const openTechForm = (technique) => {
    if (technique) {
      setEditingTechId(technique.id);
      setTechForm({
        title: technique.title,
        description: technique.description || '',
        steps: (technique.steps || []).join('\n'),
        payloads: (technique.payloads || []).join('\n'),
        tags: (technique.tags || []).join(', '),
        notes: technique.notes || '',
      });
    } else {
      setEditingTechId(null);
      setTechForm({ title: '', description: '', steps: '', payloads: '', tags: '', notes: '' });
    }
    setShowTechForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const saveTechnique = async () => {
    if (!techForm.title.trim() || !activeCat) return;
    const storageDir = getStorageDir();
    
    const technique = {
      id: editingTechId || genId(),
      title: techForm.title.trim(),
      description: techForm.description.trim(),
      steps: techForm.steps.split('\n').filter(s => s.trim()),
      payloads: techForm.payloads.split('\n').filter(s => s.trim()),
      tags: techForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      notes: techForm.notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editingTechId) {
      const existing = (data[activeCat] || []).find(t => t.id === editingTechId);
      technique.createdAt = existing?.createdAt || new Date().toISOString();
    } else {
      technique.createdAt = new Date().toISOString();
    }

    setSaving(true);
    try {
      await window.electronAPI.techniquesSave({ storageDir, categoryId: activeCat, technique });
      await loadData();
    } catch (e) { console.error(e); }
    setTimeout(() => setSaving(false), 800);

    setShowTechForm(false);
    setEditingTechId(null);
  };

  const deleteTechnique = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this technique permanently?")) return;
    const storageDir = getStorageDir();
    if (!storageDir) return;
    try {
      await window.electronAPI.techniquesDelete({ storageDir, categoryId: activeCat, techniqueId: id });
      await loadData();
      closeViewer();
    } catch (e) { console.error(e); }
  };

  const openViewer = (tech) => {
    setActiveTechnique(tech);
    setTimeout(() => setViewerAnim(true), 10);
  };
  const closeViewer = () => {
    setViewerAnim(false);
    setTimeout(() => setActiveTechnique(null), 300);
  };

  const copyText = (t, k) => { navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(''), 2000); };

  const cat = categories.find(c => c.id === activeCat);
  const techniques = (data[activeCat] || []).filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return t.title.toLowerCase().includes(s) || t.description?.toLowerCase().includes(s) ||
      t.tags?.some(tag => tag.toLowerCase().includes(s));
  });

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#030305' }}>
      
      {/* 1. Category Sidebar */}
      <div style={{
        width: '280px', borderRight: '1px solid rgba(255,255,255,0.03)',
        backgroundColor: '#07070A', padding: '24px 0', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '8px', background: 'rgba(167, 139, 250, 0.1)', borderRadius: '10px' }}>
               <BookOpen size={20} color="#A78BFA" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#E2E8F0', letterSpacing: '-0.5px' }}>TECH VAULT</div>
              <div style={{ fontSize: '11px', color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Execution Arsenal</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Categories</div>
          <button onClick={() => openCatForm(null)} style={{ ...iconBtnStyle, color: '#A78BFA', background: 'rgba(167, 139, 250, 0.1)' }} title="New Category"><Plus size={14}/></button>
        </div>

        <div style={{ padding: '0 12px' }}>
          {categories.map(c => {
            const count = (data[c.id] || []).length;
            const isActive = activeCat === c.id;
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', margin: '4px 0', borderRadius: '10px', backgroundColor: isActive ? 'rgba(255,255,255,0.05)' : 'transparent', border: isActive ? `1px solid ${c.color}30` : '1px solid transparent', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
                {isActive && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: c.color, boxShadow: `0 0 10px ${c.color}` }} />}
                <button onClick={() => { setActiveCat(c.id); setShowTechForm(false); setSearch(''); setShowCatForm(false); }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', border: 'none', cursor: 'pointer', background: 'none' }}>
                  <span style={{ fontSize: '16px', filter: isActive ? `drop-shadow(0 0 8px ${c.color}80)` : 'none' }}>{c.emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 500, color: isActive ? '#FFF' : 'rgba(255,255,255,0.5)', textAlign: 'left', flex: 1 }}>{c.name}</span>
                  {count > 0 && <span style={{ fontSize: '11px', fontWeight: 700, color: c.color, backgroundColor: `${c.color}15`, padding: '2px 8px', borderRadius: '12px' }}>{count}</span>}
                </button>
                {isActive && (
                  <div style={{ display: 'flex', paddingRight: '12px', gap: '4px' }}>
                    <button onClick={() => openCatForm(c)} style={iconBtnStyle}><Edit3 size={14}/></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* Category Form Modal Overlay */}
        {showCatForm && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '380px', backgroundColor: '#0D0D14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '32px', boxShadow: '0 24px 50px rgba(0,0,0,0.8)' }}>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', color: '#FFF', fontWeight: 700 }}>{catForm.id ? 'Edit Category' : 'New Category'}</h3>
              
              <Field label="Category Name" value={catForm.name} onChange={v => setCatForm({...catForm, name: v})} placeholder="e.g. Server-Side Request Forgery" />
              
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: '20px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pick Emoji</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
                {EMJ.map(e => (
                  <button key={e} onClick={() => setCatForm({...catForm, emoji: e})} 
                    style={{ fontSize: '20px', padding: '8px', background: catForm.emoji === e ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid', borderColor: catForm.emoji === e ? 'rgba(255,255,255,0.2)' : 'transparent', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{e}</button>
                ))}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input type="text" maxLength="2" value={catForm.emoji} onChange={e => setCatForm({...catForm, emoji: e.target.value})} title="Custom Emoji" style={{ width: '42px', height: '42px', fontSize: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.5)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px', color: '#FFF', outline: 'none', marginLeft: '8px' }} />
                </div>
              </div>
              
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Pick Color Accent</label>
              <div style={{ display: 'flex', gap: '14px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
                {['#EF4444', '#F97316', '#F59E0B', '#22C55E', '#06B6D4', '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#14B8A6'].map(c => (
                  <button key={c} onClick={() => setCatForm({...catForm, color: c})} 
                    style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c, border: catForm.color === c ? '2px solid #FFF' : '2px solid transparent', outline: catForm.color === c ? `2px solid ${c}50` : 'none', cursor: 'pointer', transition: 'all 0.2s' }} />
                ))}
                <div style={{ position: 'relative', width: '26px', height: '26px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)', marginLeft: '4px' }}>
                  <input type="color" value={catForm.color} onChange={e => setCatForm({...catForm, color: e.target.value})} style={{ position: 'absolute', top: '-10px', left: '-10px', width: '50px', height: '50px', cursor: 'pointer', border: 'none', padding: 0 }} title="Custom Color" />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {catForm.id && <button onClick={(e) => deleteCategory(catForm.id, e)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', color: '#EF4444', cursor: 'pointer', marginRight: 'auto' }}><Trash2 size={16}/></button>}
                <button onClick={() => setShowCatForm(false)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#FFF', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                <button onClick={saveCategory} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: catForm.color, color: '#FFF', fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 14px ${catForm.color}60` }}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        {cat ? (
          <div style={{ padding: '40px 50px 30px', borderBottom: '1px solid rgba(255,255,255,0.03)', background: `radial-gradient(ellipse at top left, ${cat.color}15, transparent 50%)` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: `linear-gradient(135deg, ${cat.color}40, ${cat.color}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', border: `1px solid ${cat.color}30`, boxShadow: `0 8px 24px ${cat.color}20` }}>
                  {cat.emoji}
                </div>
                <div>
                  <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0', letterSpacing: '-1px' }}>{cat.name}</h2>
                  <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayoutGrid size={14} color={cat.color} /> {techniques.length} Execution Vectors
                  </div>
                </div>
              </div>
              <button onClick={() => openTechForm(null)} style={{ padding: '12px 28px', borderRadius: '12px', border: 'none', backgroundColor: '#FFF', color: '#000', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 14px rgba(255,255,255,0.2)', transition: 'all 0.2s' }}>
                <Plus size={18} /> Add Technique
              </button>
            </div>
            
            <div style={{ position: 'relative', width: '340px' }}>
              <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payloads, titles, or tags..." style={{ width: '100%', padding: '12px 16px 12px 44px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#FFF', fontSize: '14px', outline: 'none', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }} />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', flexDirection: 'column', gap: '20px' }}>
            <FolderPlus size={64} color="rgba(255,255,255,0.05)" />
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.2)' }}>Select or create a Category to view the Vault</div>
          </div>
        )}

        {/* Content Body */}
        {cat && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 50px' }}>
            
            {showTechForm ? (
              <div ref={formRef} style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '40px', backdropFilter: 'blur(20px)', boxShadow: '0 24px 50px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', background: `${cat.color}20`, borderRadius: '10px', color: cat.color }}><Edit3 size={20}/></div>
                    <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#FFF' }}>{editingTechId ? 'Edit Vector' : 'New Execution Vector'}</h3>
                  </div>
                  <button onClick={() => setShowTechForm(false)} style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', border: 'none', color: '#FFF', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <Field label="Technique Name" value={techForm.title} onChange={v => setTechForm({...techForm, title: v})} placeholder="e.g., Blind SQLi Time-Based Payload" />
                  <Field label="Description & Context" value={techForm.description} onChange={v => setTechForm({...techForm, description: v})} placeholder="Explain when and why to use this..." multiline rows={2} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <Field label="Execution Steps (One per line)" value={techForm.steps} onChange={v => setTechForm({...techForm, steps: v})} placeholder={"1. Identify injection point\n2. Inject payload\n3. Observe delay"} multiline rows={6} />
                    <Field label="Notes / Remediation" value={techForm.notes} onChange={v => setTechForm({...techForm, notes: v})} placeholder="Additional thoughts, bypasses..." multiline rows={6} />
                  </div>

                  <Field label="Payloads (One per line)" value={techForm.payloads} onChange={v => setTechForm({...techForm, payloads: v})} placeholder={"' WAITFOR DELAY '0:0:5'--"} multiline rows={4} mono />
                  
                  <div style={{ position: 'relative' }}>
                    <Field label="Tags (Comma separated)" value={techForm.tags} onChange={v => setTechForm({...techForm, tags: v})} placeholder="sqli, blind, time-based, bypass" />
                    <Hash size={16} style={{ position: 'absolute', right: '16px', top: '42px', color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', marginTop: '40px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                  <button onClick={() => setShowTechForm(false)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#FFF', fontWeight: 600, cursor: 'pointer' }}>Discard</button>
                  <button onClick={saveTechnique} style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', backgroundColor: cat.color, color: '#FFF', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 8px 24px ${cat.color}40` }}>
                    <Save size={18} /> {saving ? 'Saving...' : 'Deploy to Vault'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', alignContent: 'start' }}>
                {techniques.map(t => (
                  <div key={t.id} onClick={() => openViewer(t)} 
                    className="snake-card"
                    style={{
                      cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      '--snake-color': cat.color,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }} 
                    onMouseOver={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 12px 30px ${cat.color}15`;
                    }} 
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
                    }}>
                    
                    <div className="snake-card-inner"></div>
                    <div className="snake-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#E2E8F0', lineHeight: '1.4', letterSpacing: '-0.3px' }}>{t.title}</h4>
                        <button onClick={(e) => { e.stopPropagation(); openTechForm(t); }} style={{ ...iconBtnStyle, opacity: 0.5, background: 'rgba(255,255,255,0.05)' }}><Edit3 size={14}/></button>
                      </div>
                      
                      {t.description && (
                        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                          {t.description}
                        </div>
                      )}
                      
                      {t.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                          {t.tags.slice(0, 4).map((tag, j) => (
                            <span key={j} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, color: cat.color, backgroundColor: `${cat.color}15`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {tag}
                            </span>
                          ))}
                          {t.tags.length > 4 && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>+{t.tags.length - 4}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {techniques.length === 0 && !search && (
                   <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                     <TerminalSquare size={48} color={cat.color} style={{ opacity: 0.5, marginBottom: '16px' }} />
                     <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#FFF' }}>Vault is empty</h3>
                     <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Add your first execution vector to this category.</p>
                   </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. PREMIUM HACKER FULL SCREEN VIEWER */}
      {activeTechnique && cat && (
        <div ref={viewerRef} style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: '#030305',
          opacity: viewerAnim ? 1 : 0, transform: viewerAnim ? 'scale(1)' : 'scale(0.98)',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Top Navbar */}
          <div style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(20px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `linear-gradient(135deg, ${cat.color}30, ${cat.color}10)`, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: `1px solid ${cat.color}40`, boxShadow: `0 0 20px ${cat.color}20` }}>
                {cat.emoji}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: cat.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>{cat.name}</span>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }}></span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>ID: {activeTechnique.id.toUpperCase()}</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.5px' }}>{activeTechnique.title}</h1>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button onClick={() => deleteTechnique(activeTechnique.id)} style={{ padding: '12px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.05)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', transition: 'all 0.2s' }} title="Delete Vector"><Trash2 size={18} /></button>
              <div style={{ width: '1px', height: '30px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
              <button onClick={toggleViewerFullscreen} style={{ padding: '12px', borderRadius: '50%', background: isViewerFullscreen ? 'rgba(167, 139, 250, 0.15)' : 'rgba(255,255,255,0.05)', color: isViewerFullscreen ? '#A78BFA' : '#FFF', border: `1px solid ${isViewerFullscreen ? 'rgba(167, 139, 250, 0.3)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', transition: 'all 0.2s' }} title={isViewerFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>{isViewerFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
              <button onClick={closeViewer} style={{ padding: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }} title="Close"><X size={20} /></button>
            </div>
          </div>

          {/* Viewer Content Scrollable Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '60px 40px', position: 'relative' }}>
            
            {/* Background Glow */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '80%', height: '300px', background: `radial-gradient(ellipse, ${cat.color}15, transparent 70%)`, pointerEvents: 'none', zIndex: 0 }}></div>

            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '50px', position: 'relative', zIndex: 1 }}>
              
              {/* Tags Section (Fixed Bug: Tags are now beautifully displayed) */}
              {activeTechnique.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {activeTechnique.tags.map((tag, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', backgroundColor: `${cat.color}10`, border: `1px solid ${cat.color}30`, color: cat.color }}>
                      <Hash size={14} />
                      <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{tag}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTechnique.description && (
                <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.7', fontWeight: 400, padding: '24px 32px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', borderLeft: `4px solid ${cat.color}` }}>
                  {activeTechnique.description}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                
                {/* Left Column: Steps */}
                {activeTechnique.steps?.length > 0 && (
                  <div style={{ backgroundColor: 'rgba(10,10,15,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                      <div style={{ padding: '8px', background: `${cat.color}20`, borderRadius: '10px', color: cat.color }}><TerminalSquare size={20}/></div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#FFF', letterSpacing: '1px', textTransform: 'uppercase' }}>Execution Chain</h3>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {activeTechnique.steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: '20px', position: 'relative', paddingBottom: i === activeTechnique.steps.length - 1 ? '0' : '32px' }}>
                          {/* Timeline Line */}
                          {i !== activeTechnique.steps.length - 1 && (
                            <div style={{ position: 'absolute', left: '15px', top: '32px', bottom: '0', width: '2px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                          )}
                          
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#000', border: `2px solid ${cat.color}`, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, flexShrink: 0, zIndex: 2, boxShadow: `0 0 12px ${cat.color}40` }}>
                            {i + 1}
                          </div>
                          <div style={{ fontSize: '16px', color: '#E2E8F0', lineHeight: '1.6', marginTop: '4px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', flex: 1 }}>
                            {step}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Right Column: Payloads & Notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                  
                  {activeTechnique.payloads?.length > 0 && (
                    <div style={{ backgroundColor: 'rgba(10,10,15,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px', color: '#22C55E' }}><Code2 size={20}/></div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#FFF', letterSpacing: '1px', textTransform: 'uppercase' }}>Weaponized Payloads</h3>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {activeTechnique.payloads.map((payload, i) => (
                          <div key={i} style={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <div style={{ padding: '6px 16px', backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Payload {i+1}</span>
                              <button onClick={() => copyText(payload, `p-${i}`)} style={{ padding: '6px 12px', borderRadius: '6px', background: copied === `p-${i}` ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.1)', color: copied === `p-${i}` ? '#22C55E' : '#FFF', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
                                {copied === `p-${i}` ? <><CheckCircle2 size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
                              </button>
                            </div>
                            <div style={{ padding: '20px 24px', overflowX: 'auto' }}>
                              <code style={{ color: '#22C55E', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', textShadow: '0 0 8px rgba(34, 197, 94, 0.3)' }}>{payload}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTechnique.notes && (
                    <div style={{ padding: '32px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#EF4444' }}></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', color: '#EF4444', fontWeight: 700, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <AlertCircle size={20} /> Field Notes
                      </div>
                      <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.7' }}>{activeTechnique.notes}</div>
                    </div>
                  )}

                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline, rows, mono }) {
  const style = {
    width: '100%', padding: '14px 18px', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#FFF', fontSize: '14px', outline: 'none', resize: 'vertical',
    fontFamily: mono ? "'JetBrains Mono', 'Fira Code', monospace" : 'inherit',
    lineHeight: '1.6', transition: 'all 0.2s',
  };
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</label>
      {multiline ? (
        <textarea rows={rows || 3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
      )}
    </div>
  );
}

const iconBtnStyle = {
  padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
  backgroundColor: 'transparent', color: 'rgba(255,255,255,0.3)',
  transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center'
};
