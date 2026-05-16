import { useState, useEffect, useRef } from 'react';
import { Book, Plus, Calendar, Save, Trash2, ChevronLeft, ChevronRight, Clock, Star, Search, FileText } from 'lucide-react';
import { readFileDirect } from '../utils/fileSystem';
import '../styles/Tools.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function HackerJournal({ storageDir, fsUpdateTrigger }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
  const [allEntries, setAllEntries] = useState({});
  const [newEntryText, setNewEntryText] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const inputRef = useRef(null);

  const getJournalPath = () => {
    return storageDir ? `${storageDir}\\Journal\\HackerJournal_data.json` : null;
  };

  useEffect(() => {
    const loadJournal = async () => {
      const path = getJournalPath();
      if (!path) return;
      const result = await readFileDirect(path);
      if (result.success) {
        try {
          const data = JSON.parse(result.content);
          
          // Data Migration from legacy format
          let entries = data.entries || {};
          if (Array.isArray(entries)) {
            const migrated = {};
            entries.forEach(oldEntry => {
              // oldEntry looks like: { date: 'May 9', items: ['tested SSRF', ...] }
              // Try to map 'May 9' to current year
              const d = new Date(`${oldEntry.date} ${now.getFullYear()}`);
              if (!isNaN(d.getTime())) {
                const dateKey = d.toISOString().split('T')[0];
                migrated[dateKey] = oldEntry.items.map(text => ({ text, time: '', starred: false }));
              }
            });
            entries = migrated;
          }
          
          setAllEntries(entries);
        } catch (e) {
          console.warn('Failed to parse Hacker Journal:', e);
        }
      }
    };
    loadJournal();
  }, [storageDir, fsUpdateTrigger]);

  const saveJournal = async (entries) => {
    const path = getJournalPath();
    if (!path || !window.electronAPI) return;
    setSaveStatus('saving');
    try {
      await window.electronAPI.saveFileDirect({
        filePath: path,
        content: JSON.stringify({ version: '2.0', entries }, null, 2)
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus('error');
    }
  };

  const handleAddEntry = (textOverride = null) => {
    const text = textOverride || newEntryText.trim();
    if (!text) return;
    const updated = { ...allEntries };
    
    // Always log to today's date if logging from the timer, otherwise use selected date
    const targetDate = textOverride ? now.toISOString().split('T')[0] : selectedDate;
    
    if (!updated[targetDate]) updated[targetDate] = [];
    updated[targetDate].push({
      text: text,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      starred: false
    });
    setAllEntries(updated);
    if (!textOverride) setNewEntryText('');
    saveJournal(updated);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleRemoveItem = (dateKey, index) => {
    const updated = { ...allEntries };
    updated[dateKey].splice(index, 1);
    if (updated[dateKey].length === 0) delete updated[dateKey];
    setAllEntries(updated);
    saveJournal(updated);
  };

  const handleToggleStar = (dateKey, index) => {
    const updated = { ...allEntries };
    updated[dateKey][index].starred = !updated[dateKey][index].starred;
    setAllEntries(updated);
    saveJournal(updated);
  };

  // Calendar logic
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = new Date().toISOString().split('T')[0];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };
  const goToToday = () => {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    setSelectedDate(n.toISOString().split('T')[0]);
  };

  const currentDateEntries = allEntries[selectedDate] || [];
  const totalEntries = Object.values(allEntries).reduce((s, arr) => s + arr.length, 0);
  const activeDays = Object.keys(allEntries).length;

  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const selectedDateDisplay = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Search functionality
  const searchResults = [];
  if (searchQuery.trim()) {
    Object.entries(allEntries).forEach(([date, items]) => {
      if (Array.isArray(items)) {
        items.forEach((item, idx) => {
          if (item && item.text && typeof item.text === 'string' && item.text.toLowerCase().includes(searchQuery.toLowerCase())) {
            searchResults.push({ date, index: idx, ...item });
          }
        });
      }
    });
  }

  return (
    <div className="tool-page page-enter" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 20px 0', borderBottom: '1px solid var(--border-default)', marginBottom: '0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
            <Book size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>Hacker Journal</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{activeDays} active days · {totalEntries} total entries</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {saveStatus && (
            <span style={{ fontSize: '11px', color: saveStatus === 'saved' ? '#10B981' : saveStatus === 'error' ? '#EF4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <Save size={12} /> {saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Saving...'}
            </span>
          )}
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{ padding: '8px', background: showSearch ? 'var(--bg-tertiary)' : 'transparent', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <Search size={16} />
          </button>
          <button
            onClick={goToToday}
            style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
          >
            Today
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left: Calendar */}
        <div style={{ width: '340px', flexShrink: 0, borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Month Navigator */}
          <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <button onClick={prevMonth} style={{ padding: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{MONTHS[viewMonth]}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{viewYear}</div>
            </div>
            <button onClick={nextMonth} style={{ padding: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div style={{ padding: '0 20px 20px', flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {DAYS.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ padding: '8px' }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasEntries = !!allEntries[dateStr]?.length;
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const entryCount = allEntries[dateStr]?.length || 0;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      position: 'relative',
                      padding: '8px 4px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: isSelected || isToday ? 700 : 500,
                      color: isSelected ? '#fff' : isToday ? '#8B5CF6' : 'var(--text-primary)',
                      background: isSelected ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'transparent',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      border: isToday && !isSelected ? '1px solid #8B5CF640' : '1px solid transparent',
                      boxShadow: isSelected ? '0 0 12px rgba(139, 92, 246, 0.4)' : 'none'
                    }}
                  >
                    {day}
                    {hasEntries && (
                      <div style={{
                        position: 'absolute',
                        bottom: '3px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '2px'
                      }}>
                        {Array.from({ length: Math.min(entryCount, 3) }).map((_, j) => (
                          <div key={j} style={{
                            width: '4px', height: '4px', borderRadius: '50%',
                            background: isSelected ? '#fff' : '#8B5CF6',
                            boxShadow: isSelected ? 'none' : '0 0 4px #8B5CF680'
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Year Quick Jump */}
          <div style={{ padding: '0 20px 20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[viewYear - 2, viewYear - 1, viewYear, viewYear + 1].map(y => (
                <button
                  key={y}
                  onClick={() => setViewYear(y)}
                  style={{
                    padding: '4px 12px',
                    background: y === viewYear ? '#8B5CF620' : 'var(--bg-deep)',
                    border: y === viewYear ? '1px solid #8B5CF640' : '1px solid var(--border-default)',
                    borderRadius: '6px',
                    color: y === viewYear ? '#8B5CF6' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >{y}</button>
              ))}
            </div>
          </div>

          {/* Search Panel (collapsible) */}
          {showSearch && (
            <div style={{ padding: '0 20px 20px', flex: 1, overflow: 'auto', borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all journal entries..."
                style={{
                  width: '100%', padding: '10px 14px', background: 'var(--bg-deep)',
                  border: '1px solid var(--border-default)', borderRadius: '8px',
                  color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px'
                }}
                autoFocus
              />
              {searchResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {searchResults.slice(0, 20).map((r, i) => (
                    <div
                      key={i}
                      onClick={() => { setSelectedDate(r.date); setShowSearch(false); setSearchQuery(''); }}
                      style={{
                        padding: '10px',
                        background: 'var(--bg-deep)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: '1px solid var(--border-default)',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontSize: '10px', color: '#8B5CF6', fontWeight: 600, marginBottom: '4px' }}>
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{r.text}</div>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px' }}>No matches found.</div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right: Day View */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Day Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={18} color="#8B5CF6" />
              {selectedDateDisplay}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: 500 }}>
              {currentDateEntries.length} {currentDateEntries.length === 1 ? 'entry' : 'entries'}
            </p>
          </div>

          {/* Entries */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {currentDateEntries.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', opacity: 0.5 }}>
                <FileText size={48} style={{ opacity: 0.2 }} />
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>No entries for this day. Start logging.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '700px' }}>
                {currentDateEntries.map((item, idx) => (
                  <div
                    key={idx}
                    className="journal-entry"
                    style={{
                      padding: '12px 16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '10px',
                      border: item.starred ? '1px solid #F59E0B30' : '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      transition: 'all 0.2s',
                      boxShadow: item.starred ? '0 0 12px rgba(245, 158, 11, 0.1)' : 'none'
                    }}
                  >
                    <span style={{ color: '#8B5CF6', fontSize: '13px', fontWeight: 700, userSelect: 'none', marginTop: '1px' }}>▸</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, wordBreak: 'break-word' }}>{item.text}</div>
                      {item.time && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} /> {item.time}
                        </div>
                      )}
                    </div>
                    <div className="journal-actions" style={{ display: 'flex', gap: '4px', opacity: 0, transition: 'opacity 0.15s' }}>
                      <button
                        onClick={() => handleToggleStar(selectedDate, idx)}
                        style={{ padding: '4px', background: 'transparent', border: 'none', color: item.starred ? '#F59E0B' : 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <Star size={14} fill={item.starred ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(selectedDate, idx)}
                        style={{ padding: '4px', background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', opacity: 0.6 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-default)',
            flexShrink: 0,
            background: 'var(--bg-primary)'
          }}>
            <div style={{ display: 'flex', gap: '12px', maxWidth: '700px' }}>
              <input
                ref={inputRef}
                value={newEntryText}
                onChange={(e) => setNewEntryText(e.target.value)}
                placeholder="tested SSRF on main domain... found hidden graphql endpoint..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddEntry()}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'var(--bg-deep)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none'
                }}
                autoFocus
              />
              <button
                onClick={() => handleAddEntry()}
                disabled={!newEntryText.trim()}
                style={{
                  padding: '0 24px',
                  background: newEntryText.trim() ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: newEntryText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: newEntryText.trim() ? '0 0 15px rgba(139, 92, 246, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={16} /> Log
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .journal-entry:hover .journal-actions {
          opacity: 1 !important;
        }
        .journal-entry:hover {
          background: var(--bg-tertiary) !important;
        }
      `}</style>
    </div>
  );
}
