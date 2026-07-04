const fs = require('fs');
let code = fs.readFileSync('electron/main.cjs', 'utf8');

const newPayload = `
      // DOM Extraction Payload
      const extractPayload = \`
        (function() {
          try {
            let result = { 
              success: true, 
              url: window.location.href, 
              programName: document.title.split('-')[0].trim() || 'Unknown', 
              inScope: [], 
              outOfScope: [],
              inScopeVulns: [],
              outOfScopeVulns: [],
              bountyTable: [],
              policy: ''
            };
            
            // Extract Scopes
            const rows = document.querySelectorAll('tr, .daisy-table-row, [role="row"]');
            rows.forEach(row => {
              const text = row.innerText.toLowerCase();
              if (text.includes('.com') || text.includes('.net') || text.includes('.io') || text.includes('.org')) {
                const isOutOfScope = text.includes('out of scope') || text.includes('not eligible') || text.includes('exclude');
                const tds = row.querySelectorAll('td, .daisy-table-cell, [role="cell"]');
                if (tds.length >= 1) {
                  const domain = tds[0].innerText.trim();
                  let itemType = 'URL';
                  if(domain.includes('*')) itemType = 'WILDCARD';
                  else if(domain.match(/^[0-9.]+$/)) itemType = 'IP';
                  else if(domain.includes('android') || domain.includes('ios')) itemType = 'MOBILE_APP';
                  else if(domain.includes('github') || domain.includes('source')) itemType = 'SOURCE_CODE';

                  if (isOutOfScope) {
                    if (!result.outOfScope.find(x => x.asset === domain)) result.outOfScope.push({ asset: domain, type: itemType });
                  } else {
                    if (!result.inScope.find(x => x.asset === domain)) result.inScope.push({ asset: domain, type: itemType });
                  }
                }
              }
            });

            // Extract Vulns smarter
            const vulnKeywords = ['rce', 'sql injection', 'xss', 'ssrf', 'csrf', 'clickjacking', 'lfi', 'rfi', 'dos', 'ddos', 'social engineering', 'phishing', 'scanner output'];
            const allTextNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            let seenVulns = new Set();
            while(node = allTextNodes.nextNode()) {
              const text = node.nodeValue.toLowerCase().trim();
              vulnKeywords.forEach(vk => {
                if(text === vk || (text.includes(vk) && text.length < 30)) {
                   if (!seenVulns.has(vk)) {
                     seenVulns.add(vk);
                     let parent = node.parentElement;
                     let scopeText = '';
                     for(let i=0; i<3; i++) {
                       if(parent) { scopeText += parent.innerText.toLowerCase() + ' '; parent = parent.parentElement; }
                     }
                     let isOutOfScope = scopeText.includes('out of scope') || scopeText.includes('exclude') || scopeText.includes('do not report') || scopeText.includes('ineligible');
                     if(isOutOfScope) result.outOfScopeVulns.push({ name: vk.toUpperCase(), status: 'Out of Scope' });
                     else result.inScopeVulns.push({ name: vk.toUpperCase(), status: 'In Scope' });
                   }
                }
              });
            }

            // Extract Bounties smarter (divs and spans too)
            const severities = ['Critical', 'High', 'Medium', 'Low'];
            const bountyRegex = /\\$([0-9,]+)/;
            const containers = document.querySelectorAll('div, tr, li');
            containers.forEach(c => {
               const text = c.innerText;
               if (text && text.includes('$') && text.length < 150) {
                 severities.forEach(sev => {
                    if (text.includes(sev)) {
                       const match = text.match(bountyRegex);
                       if (match) {
                         const existing = result.bountyTable.find(b => b.severity === sev);
                         if (!existing || parseInt(existing.amount.replace(/[^0-9]/g, '')) < parseInt(match[1].replace(/[^0-9]/g, ''))) {
                            result.bountyTable = result.bountyTable.filter(b => b.severity !== sev);
                            result.bountyTable.push({ severity: sev, amount: '$' + match[1] });
                         }
                       }
                    }
                 });
               }
            });

            if (result.bountyTable.length === 0) {
              result.bountyTable = [
                {severity: 'Critical', amount: 'See Page'},
                {severity: 'High', amount: 'See Page'},
                {severity: 'Medium', amount: 'See Page'},
                {severity: 'Low', amount: 'See Page'}
              ];
            }

            // Clean Policy Extraction!
            let policyContent = '';
            // Try specific HackerOne/Bugcrowd content containers first
            const policyContainers = document.querySelectorAll('.daisy-markdown, .markdown-body, [data-testid="policy-content"], .program-policy, #policy');
            if (policyContainers.length > 0) {
              policyContent = policyContainers[0].innerText;
            } else {
              // Fallback: find the largest contiguous block of text that doesn't look like a nav menu
              let maxText = 0;
              document.querySelectorAll('div, article, section').forEach(el => {
                 let clone = el.cloneNode(true);
                 // Remove garbage
                 clone.querySelectorAll('nav, header, footer, script, style, .sidebar, [role="navigation"]').forEach(n => n.remove());
                 const text = clone.innerText || '';
                 if (text.length > maxText && text.length < 30000 && !text.includes('Skip to main content')) {
                    maxText = text.length;
                    policyContent = text;
                 }
              });
            }
            
            // Clean up the policy text so it's not a huge wall of garbage
            result.policy = policyContent.replace(/Skip to main content.*/i, '').replace(/Learn more about HackerOne.*/i, '').trim().substring(0, 3000) + (policyContent.length > 3000 ? '...' : '');

            console.log('EXTRACTED_DATA:' + JSON.stringify(result));
            return result;
          } catch(err) {
            console.log('EXTRACTED_DATA:' + JSON.stringify({ success: false, error: err.message }));
            return { success: false, error: err.message };
          }
        })();
      \`;`;

const startIdx = code.indexOf('// DOM Extraction Payload');
const endIdx = code.indexOf('}).catch(err => {', startIdx) - 9; // The closing of the string literal

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + newPayload + code.substring(endIdx);
  fs.writeFileSync('electron/main.cjs', code);
  console.log("Updated DOM Extractor!");
} else {
  console.log("Could not find payload markers");
}
