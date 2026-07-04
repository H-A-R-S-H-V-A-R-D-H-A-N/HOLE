

export const vulnTemplates = [
  {
    id: 'xss',
    name: 'Cross-Site Scripting (XSS)',
    severity: 'high',
    tags: ['xss', 'injection'],
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Cross-Site Scripting (XSS)' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📍 Target' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'URL: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'https://example.com/vulnerable-endpoint' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Parameter: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'q' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🔍 Description' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe the XSS vulnerability found...' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '💣 Payload' }] },
        { type: 'codeBlock', attrs: { language: 'html' }, content: [{ type: 'text', text: '<script>alert(document.cookie)</script>' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📋 Steps to Reproduce' }] },
        { type: 'taskList', content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Navigate to the target URL' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Insert payload into the parameter' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Observe script execution' }] }] },
        ]},
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '💥 Impact' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Session hijacking, cookie theft, phishing...' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🛡️ Remediation' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Implement proper input validation and output encoding.' }] },
      ]
    }
  },
  {
    id: 'sqli',
    name: 'SQL Injection',
    severity: 'critical',
    tags: ['sqli', 'injection', 'database'],
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'SQL Injection' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📍 Target' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'URL: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'https://example.com/api/endpoint' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Parameter: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'id' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🔍 Description' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe the SQL injection vulnerability...' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '💣 Payload' }] },
        { type: 'codeBlock', attrs: { language: 'sql' }, content: [{ type: 'text', text: "' OR 1=1 --\n' UNION SELECT username, password FROM users --" }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📋 Steps to Reproduce' }] },
        { type: 'taskList', content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Identify the injection point' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test with boolean-based payloads' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Extract data via UNION-based injection' }] }] },
        ]},
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '💥 Impact' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Full database access, data exfiltration, potential RCE...' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🛡️ Remediation' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Use parameterized queries / prepared statements.' }] },
      ]
    }
  },
  {
    id: 'ssrf',
    name: 'Server-Side Request Forgery (SSRF)',
    severity: 'high',
    tags: ['ssrf', 'server-side'],
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Server-Side Request Forgery (SSRF)' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📍 Target' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'URL: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'https://example.com/api/fetch?url=' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🔍 Description' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe the SSRF vulnerability...' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '💣 Payload' }] },
        { type: 'codeBlock', attrs: { language: 'bash' }, content: [{ type: 'text', text: 'curl "https://example.com/api/fetch?url=http://169.254.169.254/latest/meta-data/"' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '💥 Impact' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Access to internal services, cloud metadata, port scanning...' }] },
      ]
    }
  },
  {
    id: 'idor',
    name: 'Insecure Direct Object Reference (IDOR)',
    severity: 'medium',
    tags: ['idor', 'authorization'],
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Insecure Direct Object Reference (IDOR)' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📍 Target' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'URL: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'https://example.com/api/users/{id}' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🔍 Description' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe the IDOR vulnerability...' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📋 Steps to Reproduce' }] },
        { type: 'taskList', content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Login as User A' }] }] },
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Access User B resources by changing the ID' }] }] },
        ]},
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '💥 Impact' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Unauthorized access to user data, PII exposure...' }] },
      ]
    }
  },
  {
    id: 'auth-bypass',
    name: 'Authentication Bypass',
    severity: 'critical',
    tags: ['auth', 'bypass', 'authentication'],
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Authentication Bypass' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '📍 Target' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'URL: ' }, { type: 'text', marks: [{ type: 'code' }], text: 'https://example.com/admin' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '🔍 Description' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe how authentication is bypassed...' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '💥 Impact' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Full unauthorized access to admin functionality...' }] },
      ]
    }
  },
  {
    id: 'blank',
    name: 'Blank Note',
    severity: 'info',
    tags: [],
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '' }] },
      ]
    }
  },
];
