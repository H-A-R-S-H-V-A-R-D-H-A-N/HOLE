const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(
  `              onLaunchRecon={(domain) => {
                setReconTargetDomain(domain);
                setActiveView('recon-engine');
              }}`,
  `              onLaunchRecon={(domain) => {
                setReconTargetDomain(domain);
                addToast(\`Recon scan started for \${domain} in background!\`, 'success');
              }}`
);

fs.writeFileSync('src/App.jsx', code);
console.log("App.jsx fixed!");
