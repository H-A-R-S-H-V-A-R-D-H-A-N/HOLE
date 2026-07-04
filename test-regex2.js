const md = '| A | B |\n\n|---|---|\n\n| 1 | 2 |';
let collapsed = md;
for (let pass = 0; pass < 5; pass++) {
  const next = collapsed.replace(/(^\|.+\|[^\S\n]*$)\n{2,}(^\|.+\|[^\S\n]*$)/gm, '$1\n$2');
  if (next === collapsed) break;
  collapsed = next;
}
console.log('NORMALIZED:', JSON.stringify(collapsed));
