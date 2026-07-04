import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Check, Copy, Download } from 'lucide-react';

export default function CodeBlockComponent({ node, updateAttributes }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const code = node.textContent;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const code = node.textContent;
    const lang = node.attrs.language || 'txt';
    const extMap = { javascript: 'js', python: 'py', bash: 'sh', shell: 'sh', typescript: 'ts', html: 'html', css: 'css', json: 'json', yaml: 'yml', xml: 'xml', sql: 'sql', go: 'go', rust: 'rs', java: 'java', c: 'c', cpp: 'cpp' };
    const ext = extMap[lang] || lang || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <NodeViewWrapper className="clean-code-block">
      <div className="clean-code-header">
        <input
          className="clean-code-lang-input"
          placeholder="type language..."
          value={node.attrs.language || ''}
          onChange={(e) => updateAttributes({ language: e.target.value })}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button className="clean-copy-btn" onClick={handleDownload} title="Download code">
            <Download size={14} />
          </button>
          <button className="clean-copy-btn" onClick={handleCopy} title="Copy code">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="clean-code-body">
        <pre>
          <NodeViewContent as="code" />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
