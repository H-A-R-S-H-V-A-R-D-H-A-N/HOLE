const md = '| A | B |\n\n|---|---|\n\n| 1 | 2 |';
const normalized = md.replace(/(^\|.+\|[^\S\n]*$)\n{2,}(^\|.+\|[^\S\n]*$)/gm, '$1\n$2');
console.log('NORMALIZED:', JSON.stringify(normalized));
