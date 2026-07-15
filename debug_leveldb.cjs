const fs = require('fs');
const path = require('path');
const os = require('os');

const levelDbPath = path.join(os.homedir(), '.config', 'hole', 'Local Storage', 'leveldb');
const files = fs.readdirSync(levelDbPath).filter(f => f.endsWith('.log') || f.endsWith('.ldb'));

for (const file of files) {
  const content = fs.readFileSync(path.join(levelDbPath, file), 'latin1');
  const index = content.indexOf('hole_file_metadata');
  if (index !== -1) {
    console.log(`\n--- Found in ${file} ---`);
    // Print the next 2000 characters, replacing non-printable characters with dots
    const snippet = content.substring(index, index + 2000);
    console.log(snippet.replace(/[^\x20-\x7E]/g, '.'));
  }
}
