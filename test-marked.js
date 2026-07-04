import { marked } from 'marked';
import hljs from 'highlight.js';

marked.setOptions({
  highlight: function(code, lang) {
    const validLang = lang ? lang.toLowerCase() : '';
    const language = hljs.getLanguage(validLang) ? validLang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
});

console.log(marked.parse('```bash\necho "Hello World"\n```'));
