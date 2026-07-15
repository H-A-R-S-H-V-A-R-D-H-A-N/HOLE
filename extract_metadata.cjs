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
  const regex = /hole_file_metadata.*?(\{.*?\})[\x00\n]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
      try {
          const parsed = JSON.parse(match[1]);
          // Merge to ensure we get the latest and largest object
          metadataMap = { ...metadataMap, ...parsed };
      } catch (e) {}
  }
}

store.hole_file_metadata = metadataMap;
fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
console.log('Successfully recovered hole_file_metadata with ' + Object.keys(metadataMap).length + ' notes linked to sections.');
