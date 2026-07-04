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

console.log(splitTableRow('| Typical syntax | `;\`, `&&`, `\\|` | `{{`, `${` | `\'`, `--`, `UNION` |'));
console.log(splitTableRow('| Pipe | `cmd1 \\| cmd2` | Pipe output |'));
