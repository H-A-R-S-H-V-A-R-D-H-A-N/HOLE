import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import Mark from 'mark.js';
import '../styles/Editor.css'; // Will add styles here later

export default function SearchOverlay({ targetView, onClose }) {
  const [query, setQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // For NoteReader (mark.js)
  useEffect(() => {
    if (targetView !== 'read') return;
    
    // Find the container dynamically, targeting ONLY the content, not the whole fullscreen wrapper
    const container = document.querySelector('.rendered-content') || document.querySelector('.reader-tiptap') || document.querySelector('.pro-content');
    if (!container) return;

    if (!markerRef.current) {
      markerRef.current = new Mark(container);
    }

    markerRef.current.unmark({
      done: () => {
        if (!query) {
          setMatchCount(0);
          setCurrentIndex(0);
          return;
        }
        markerRef.current.mark(query, {
          className: 'search-highlight',
          separateWordSearch: false,
          exclude: ['pre', 'code', '.reader-code-wrapper'],
          done: (count) => {
            setMatchCount(count);
            setCurrentIndex(count > 0 ? 1 : 0);
            if (count > 0) scrollToMatch(1);
          }
        });
      }
    });

    return () => {
      if (markerRef.current) markerRef.current.unmark();
    };
  }, [query, targetView]);

  // For NoteEditor (TipTap Custom Extension)
  useEffect(() => {
    if (targetView !== 'editor' || !window.tiptapEditor) return;
    const editor = window.tiptapEditor;

    let count = 0;
    if (query) {
      const lowerQuery = query.toLowerCase();
      const textContent = editor.state.doc.textContent.toLowerCase();
      let idx = 0;
      while ((idx = textContent.indexOf(lowerQuery, idx)) > -1) {
        count++;
        idx += lowerQuery.length;
      }
    }
    setMatchCount(count);
    setCurrentIndex(count > 0 ? 1 : 0);

    // Dispatch to official SearchAndReplace plugin
    try {
      editor.commands.setSearchTerm(query);
      if (count > 0) scrollTipTapToMatch(0);
    } catch (e) {
      console.error('Search dispatch failed', e);
    }

    return () => {
      if (window.tiptapEditor) {
        try {
          window.tiptapEditor.commands.setSearchTerm('');
        } catch (e) {}
      }
    };
  }, [query, targetView]);

  const scrollToMatch = (index) => {
    if (targetView === 'read') {
      const marks = document.querySelectorAll('mark.search-highlight');
      if (marks && marks.length > 0 && marks[index - 1]) {
        // Remove active class from all
        marks.forEach(m => m.classList.remove('active-match'));
        // Add to current
        marks[index - 1].classList.add('active-match');
        marks[index - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const scrollTipTapToMatch = (zeroBasedIndex) => {
    const editor = window.tiptapEditor;
    if (!editor) return;
    setTimeout(() => {
      // The official plugin uses '-current' instead of '-active' for the active match
      const activeMark = document.querySelector('.search-highlight-current');
      if (activeMark) {
        activeMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 10);
  };

  const handleNext = () => {
    if (matchCount === 0) return;
    let nextIdx = currentIndex < matchCount ? currentIndex + 1 : 1;
    setCurrentIndex(nextIdx);

    if (targetView === 'read') {
      scrollToMatch(nextIdx);
    } else {
      const editor = window.tiptapEditor;
      if (editor) {
        editor.commands.nextSearchResult();
        scrollTipTapToMatch(nextIdx - 1);
      }
    }
  };

  const handlePrev = () => {
    if (matchCount === 0) return;
    let prevIdx = currentIndex > 1 ? currentIndex - 1 : matchCount;
    setCurrentIndex(prevIdx);

    if (targetView === 'read') {
      scrollToMatch(prevIdx);
    } else {
      const editor = window.tiptapEditor;
      if (editor) {
        editor.commands.previousSearchResult();
        scrollTipTapToMatch(prevIdx - 1);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Prevent TipTap from inserting a newline!
      if (e.shiftKey) handlePrev();
      else handleNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="search-overlay glass-panel">
      <Search size={16} className="search-icon" />
      <input
        ref={inputRef}
        className="search-input"
        type="text"
        placeholder="Find in note..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {(query && matchCount >= 0) && (
        <span className="search-count">
          {matchCount > 0 ? `${currentIndex}/${matchCount}` : '0/0'}
        </span>
      )}
      <div className="search-actions">
        <button className="search-btn" onMouseDown={(e) => e.preventDefault()} onClick={handlePrev} title="Previous (Shift+Enter)"><ChevronUp size={16} /></button>
        <button className="search-btn" onMouseDown={(e) => e.preventDefault()} onClick={handleNext} title="Next (Enter)"><ChevronDown size={16} /></button>
        <div className="search-divider"></div>
        <button className="search-btn close-btn" onClick={onClose} title="Close (Esc)"><X size={16} /></button>
      </div>
    </div>
  );
}
