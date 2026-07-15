const { spawn } = require('child_process');
const proc = spawn('./bin/echo_engine', ['-json']);
const stripAnsi = (str) => str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
let urlExtracted = false;

const handleOutput = (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (!line.trim()) return;
    const cleanLine = stripAnsi(line.trim());
    try {
      const parsed = JSON.parse(cleanLine);
      if (parsed.protocol) {
        console.log("INTERACTION CAPTURED:", parsed.protocol);
        process.exit(0);
      }
    } catch (e) {}

    if (!urlExtracted && cleanLine.includes('[INF]')) {
      const match = cleanLine.match(/([a-z0-9]+\.(oast|interact\.sh)[a-z0-9.-]*)/i);
      if (match) {
        urlExtracted = true;
        const url = match[1];
        console.log("EXTRACTED URL:", url);
        require('child_process').exec(`curl -s http://${url}`, () => {});
      }
    }
  });
};
proc.stdout.on('data', handleOutput);
proc.stderr.on('data', handleOutput);
