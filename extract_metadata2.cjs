const fs = require('fs');
const path = require('path');
const os = require('os');

const levelDbPath = path.join(os.homedir(), '.config', 'hole', 'Local Storage', 'leveldb');
const storePath = path.join(os.homedir(), '.config', 'hole', 'hole_store.json');
let store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

const files = fs.readdirSync(levelDbPath).filter(f => f.endsWith('.log') || f.endsWith('.ldb'));
let metadataMap = {};

for (const file of files) {
  const content = fs.readFileSync(path.join(levelDbPath, file), 'latin1');
  // Less strict regex to find the hole_file_metadata object
  const regex = /hole_file_metadata.*?(\{.*?customSection.*?\})/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
      try {
          const valStr = match[1];
          const parsed = JSON.parse(valStr);
          metadataMap = { ...metadataMap, ...parsed };
      } catch (e) {}
  }
}

store.hole_file_metadata = metadataMap;
fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
console.log('Successfully recovered hole_file_metadata with ' + Object.keys(metadataMap).length + ' notes linked to sections.');
