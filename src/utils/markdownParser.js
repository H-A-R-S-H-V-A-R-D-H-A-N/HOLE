/**
 * Markdown / HTML rendering utilities for HOLE-PRO.
 *
 * Uses the `marked` library for full GitHub-Flavored Markdown (GFM) support
 * including tables, task-lists, fenced code blocks, strikethrough, etc.
 */

import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css'; // Dark theme matching the app

// Configure marked for GFM + smart rendering
marked.setOptions({
  gfm: true,
  breaks: true,        // Convert \n to <br>
});

// Use a custom renderer for code blocks to inject highlight.js
const renderer = {
  code(codeBlock) {
    // In marked v18+, the first argument is a token object
    let text = codeBlock;
    let lang = '';
    if (typeof codeBlock === 'object') {
      text = codeBlock.text;
      lang = codeBlock.lang || '';
    }
    const validLang = lang ? lang.toLowerCase() : '';
    // Apply default generic highlighting if no language provided
    const language = hljs.getLanguage(validLang) ? validLang : 'bash';
    const highlighted = hljs.highlight(text, { language }).value;
    
    // Only inject the language class if the user explicitly provided one!
    // This allows NoteReader to label it as "Code" instead of "Bash" when empty.
    const langClass = lang ? ` language-${validLang}` : '';
    return `<pre><code class="hljs${langClass}">${highlighted}</code></pre>\n`;
  },
  heading(headingToken) {
    const text = typeof headingToken === 'object' ? headingToken.text : headingToken;
    const level = typeof headingToken === 'object' ? headingToken.depth : 1;
    // Simple slugify: lowercase, replace spaces with hyphens, remove non-alphanumeric
    const id = text.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w-]/g, '');
    return `<h${level} id="${id}">${text}</h${level}>\n`;
  }
};

marked.use({ renderer });

/**
 * Pre-process markdown pipe tables into HTML before marked runs.
 * This is needed because `breaks: true` in marked converts \n to <br>,
 * which breaks GFM table block detection.
 * Also handles blank lines between table rows (common from Tiptap editor).
 */
function splitTableRow(line) {
  const cells = [];
  let currentCell = '';
  let inCode = false;
  
  let processLine = line.trim();
  if (processLine.startsWith('|')) processLine = processLine.substring(1);
  if (processLine.endsWith('|') && !processLine.endsWith('\\|')) {
    processLine = processLine.substring(0, processLine.length - 1);
  }

  for (let i = 0; i < processLine.length; i++) {
    const char = processLine[i];
    const prevChar = i > 0 ? processLine[i-1] : '';
    
    if (char === '`' && prevChar !== '\\') {
      inCode = !inCode;
      currentCell += char;
      continue;
    }
    
    if (char === '|' && !inCode && prevChar !== '\\') {
      cells.push(currentCell.trim());
      currentCell = '';
      continue;
    }
    
    currentCell += char;
  }
  
  cells.push(currentCell.trim());
  return cells;
}

function preprocessTables(md) {
  // First, collapse blank lines between pipe-table rows so they're consecutive
  // This handles the case where the editor inserted empty lines between rows
  const normalized = md.replace(
    /(^[ \t]*\|.+\|[^\S\n]*$)\n{2,}(^[ \t]*\|.+\|[^\S\n]*$)/gm,
    '$1\n$2'
  );
  // Run the collapse multiple times to handle chains of rows with blank lines
  let collapsed = normalized;
  for (let pass = 0; pass < 5; pass++) {
    const next = collapsed.replace(
      /(^[ \t]*\|.+\|[^\S\n]*$)\n{2,}(^[ \t]*\|.+\|[^\S\n]*$)/gm,
      '$1\n$2'
    );
    if (next === collapsed) break;
    collapsed = next;
  }

  const lines = collapsed.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const headerLine = lines[i];
    const sepLine = lines[i + 1];

    if (
      headerLine && sepLine &&
      /^[ \t]*\|(.+\|)+\s*$/.test(headerLine) &&
      /^[ \t]*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(sepLine)
    ) {
      // Found a table — parse the header
      const headers = splitTableRow(headerLine);
      let table = '<table><thead><tr>';
      headers.forEach(h => { table += `<th>${marked.parseInline(h)}</th>`; });
      table += '</tr></thead><tbody>';

      // Skip header + separator
      i += 2;

      // Parse body rows (skip any remaining blank lines)
      while (i < lines.length) {
        if (lines[i].trim() === '') { i++; continue; } // skip blanks
        if (!/^[ \t]*\|(.+\|)+\s*$/.test(lines[i])) break; // not a table row
        const cells = splitTableRow(lines[i]);
        table += '<tr>';
        cells.forEach(c => { table += `<td>${marked.parseInline(c)}</td>`; });
        table += '</tr>';
        i++;
      }

      table += '</tbody></table>\n';
      result.push(table);
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join('\n');
}

/**
 * Convert raw Markdown string → rendered HTML string.
 */
export function markdownToHtml(md) {
  if (!md || typeof md !== 'string') return '<p>No content available.</p>';
  try {
    const preprocessed = preprocessTables(md);
    return marked.parse(preprocessed);
  } catch {
    // Fallback: at least show the raw text in paragraphs
    return md
      .split('\n')
      .map(line => `<p>${line || '<br>'}</p>`)
      .join('');
  }
}

/**
 * Detect the "render type" of a note based on its origin / file extension.
 * Returns one of: 'html' | 'markdown' | 'tiptap' (default for JSON notes)
 */
export function detectRenderType(filename = '', content = '') {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'md' || ext === 'markdown' || ext === 'mkd' || ext === 'mdx') {
    return 'markdown';
  }

  if (ext === 'html' || ext === 'htm') {
    return 'html';
  }

  // Auto-detect from content when no extension hint
  if (content) {
    const trimmed = content.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) return 'html';
    // Check for common markdown indicators
    if (/^#{1,6}\s/m.test(content) || /^```/m.test(content) || /^\*\*.*\*\*/m.test(content)) return 'markdown';
  }

  return 'tiptap'; // Default: Tiptap HTML (already rendered)
}

/**
 * Render content to final HTML based on its type.
 * - 'markdown' → parse MD → HTML
 * - 'html' → pass through as-is
 * - 'tiptap' → pass through as-is (already HTML from Tiptap editor)
 */
export function renderContent(content, renderType) {
  switch (renderType) {
    case 'markdown':
      return markdownToHtml(content);
    case 'html':
      return content;
    case 'tiptap':
    default:
      return content;
  }
}
