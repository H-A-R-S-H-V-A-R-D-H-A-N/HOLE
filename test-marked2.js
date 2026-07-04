import { marked } from 'marked';
import hljs from 'highlight.js';

const renderer = {
  code(code, lang) {
    let language;
    let text = code;
    if (typeof code === 'object') {
       text = code.text;
       lang = code.lang;
    }
    const validLang = lang ? lang.toLowerCase() : '';
    language = hljs.getLanguage(validLang) ? validLang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>\n`;
  }
};

marked.use({ renderer });

console.log(marked.parse('```bash\necho "Hello World"\n```'));
