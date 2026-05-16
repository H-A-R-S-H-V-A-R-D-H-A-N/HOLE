import { useState } from 'react';
import { GitCompare, Trash2 } from 'lucide-react';
import '../styles/Tools.css';

export default function DiffScope() {
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');

  const computeDiff = () => {
    if (!inputA && !inputB) return { matches: [], diffs: [] };
    
    const linesA = inputA.split('\n');
    const linesB = inputB.split('\n');
    const maxLen = Math.max(linesA.length, linesB.length);
    const matches = [];
    const diffs = [];

    for (let i = 0; i < maxLen; i++) {
      const a = linesA[i] ?? '';
      const b = linesB[i] ?? '';
      if (a === b) {
        if (a.trim()) matches.push({ line: i + 1, text: a });
      } else {
        diffs.push({ line: i + 1, a, b });
      }
    }
    return { matches, diffs };
  };

  const { matches, diffs } = computeDiff();

  return (
    <div className="tool-page page-enter">
      <div className="tool-header">
        <div className="tool-header-left">
          <GitCompare size={28} />
          <div>
            <h1 className="tool-title">Diff Scope</h1>
            <p className="tool-subtitle">Character-level analysis between two inputs</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => { setInputA(''); setInputB(''); }}>
          <Trash2 size={16} /> Clear All
        </button>
      </div>

      <div className="diff-inputs">
        <div className="diff-input-col">
          <label className="tool-label">INPUT A</label>
          <textarea
            className="tool-textarea"
            value={inputA}
            onChange={(e) => setInputA(e.target.value)}
            placeholder="Enter first text..."
            rows={8}
          />
        </div>
        <div className="diff-input-col">
          <label className="tool-label">INPUT B</label>
          <textarea
            className="tool-textarea"
            value={inputB}
            onChange={(e) => setInputB(e.target.value)}
            placeholder="Enter second text..."
            rows={8}
          />
        </div>
      </div>

      <div className="diff-results">
        <div className="diff-result-col">
          <label className="tool-label" style={{ color: '#10B981' }}>MATCHES (SAME)</label>
          <div className="diff-result-box diff-match-box">
            {matches.length === 0 ? (
              <span className="diff-empty">No exact matches found.</span>
            ) : (
              matches.map((m, i) => (
                <div key={i} className="diff-line diff-line-match">
                  <span className="diff-line-num">{m.line}</span>
                  <span>{m.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="diff-result-col">
          <label className="tool-label" style={{ color: '#EF4444' }}>DIFFERENCES (NOT SAME)</label>
          <div className="diff-result-box diff-diff-box">
            {diffs.length === 0 ? (
              <span className="diff-empty">Identical content.</span>
            ) : (
              diffs.map((d, i) => (
                <div key={i} className="diff-line diff-line-diff">
                  <span className="diff-line-num">{d.line}</span>
                  <div>
                    {d.a && <div className="diff-removed">- {d.a}</div>}
                    {d.b && <div className="diff-added">+ {d.b}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
