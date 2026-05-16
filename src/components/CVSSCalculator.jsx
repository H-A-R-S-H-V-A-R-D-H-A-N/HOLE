import { useState, useMemo } from 'react';
import { Calculator, Copy, CheckCircle2, ShieldAlert } from 'lucide-react';
import '../styles/Tools.css';

const METRICS = {
  AV: { id: 'AV', name: 'Attack Vector', options: [{ id: 'N', label: 'Network', value: 0.85 }, { id: 'A', label: 'Adjacent', value: 0.62 }, { id: 'L', label: 'Local', value: 0.55 }, { id: 'P', label: 'Physical', value: 0.2 }] },
  AC: { id: 'AC', name: 'Attack Complexity', options: [{ id: 'L', label: 'Low', value: 0.77 }, { id: 'H', label: 'High', value: 0.44 }] },
  PR: { id: 'PR', name: 'Privileges Required', options: [{ id: 'N', label: 'None', value: 0.85 }, { id: 'L', label: 'Low', value: { U: 0.62, C: 0.68 } }, { id: 'H', label: 'High', value: { U: 0.27, C: 0.50 } }] },
  UI: { id: 'UI', name: 'User Interaction', options: [{ id: 'N', label: 'None', value: 0.85 }, { id: 'R', label: 'Required', value: 0.62 }] },
  S: { id: 'S', name: 'Scope', options: [{ id: 'U', label: 'Unchanged' }, { id: 'C', label: 'Changed' }] },
  C: { id: 'C', name: 'Confidentiality', options: [{ id: 'H', label: 'High', value: 0.56 }, { id: 'L', label: 'Low', value: 0.22 }, { id: 'N', label: 'None', value: 0 }] },
  I: { id: 'I', name: 'Integrity', options: [{ id: 'H', label: 'High', value: 0.56 }, { id: 'L', label: 'Low', value: 0.22 }, { id: 'N', label: 'None', value: 0 }] },
  A: { id: 'A', name: 'Availability', options: [{ id: 'H', label: 'High', value: 0.56 }, { id: 'L', label: 'Low', value: 0.22 }, { id: 'N', label: 'None', value: 0 }] }
};

const defaultVector = { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'N', I: 'N', A: 'N' };

function getSeverity(score) {
  if (score === 0) return { label: 'None', color: '#8B95A8' };
  if (score >= 0.1 && score <= 3.9) return { label: 'Low', color: '#10B981' };
  if (score >= 4.0 && score <= 6.9) return { label: 'Medium', color: '#F59E0B' };
  if (score >= 7.0 && score <= 8.9) return { label: 'High', color: '#EF4444' };
  if (score >= 9.0 && score <= 10.0) return { label: 'Critical', color: '#991B1B' };
  return { label: 'Unknown', color: '#8B95A8' };
}

function roundUp(num) {
  return Math.ceil(num * 10) / 10;
}

export default function CVSSCalculator() {
  const [vector, setVector] = useState(defaultVector);
  const [copied, setCopied] = useState(false);

  const calculateScore = () => {
    const scope = vector.S;
    
    // Get values
    const av = METRICS.AV.options.find(o => o.id === vector.AV).value;
    const ac = METRICS.AC.options.find(o => o.id === vector.AC).value;
    
    // PR depends on Scope
    const prRaw = METRICS.PR.options.find(o => o.id === vector.PR).value;
    const pr = typeof prRaw === 'number' ? prRaw : prRaw[scope];
    
    const ui = METRICS.UI.options.find(o => o.id === vector.UI).value;
    const c = METRICS.C.options.find(o => o.id === vector.C).value;
    const i = METRICS.I.options.find(o => o.id === vector.I).value;
    const a = METRICS.A.options.find(o => o.id === vector.A).value;

    const iss = 1 - ((1 - c) * (1 - i) * (1 - a));
    
    let impact = 0;
    if (scope === 'U') {
      impact = 6.42 * iss;
    } else {
      impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
    }
    
    const exploitability = 8.22 * av * ac * pr * ui;
    
    if (impact <= 0) return 0.0;
    
    let baseScore = 0;
    if (scope === 'U') {
      baseScore = roundUp(Math.min(impact + exploitability, 10));
    } else {
      baseScore = roundUp(Math.min(1.08 * (impact + exploitability), 10));
    }
    
    return baseScore;
  };

  const score = useMemo(() => calculateScore().toFixed(1), [vector]);
  const severity = useMemo(() => getSeverity(parseFloat(score)), [score]);
  const vectorString = `CVSS:3.1/AV:${vector.AV}/AC:${vector.AC}/PR:${vector.PR}/UI:${vector.UI}/S:${vector.S}/C:${vector.C}/I:${vector.I}/A:${vector.A}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${vectorString} (${score} ${severity.label})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateVector = (metric, val) => {
    setVector(prev => ({ ...prev, [metric]: val }));
  };

  return (
    <div className="tool-page page-enter">
      <div className="tool-header" style={{ marginBottom: '24px' }}>
        <div className="tool-header-left">
          <Calculator size={28} />
          <div>
            <h1 className="tool-title">CVSS 3.1 Calculator</h1>
            <p className="tool-subtitle">Standardized vulnerability severity scoring for bug bounty reports.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Column: Metrics */}
        <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.values(METRICS).map(metric => (
            <div key={metric.id} style={{ 
              background: 'var(--bg-primary)', 
              border: '1px solid var(--border-default)', 
              borderRadius: 'var(--radius-lg)',
              padding: '16px'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                {metric.name} ({metric.id})
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {metric.options.map(opt => {
                  const isActive = vector[metric.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => updateVector(metric.id, opt.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: `1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                        background: isActive ? 'var(--accent-primary-20)' : 'var(--bg-secondary)',
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease',
                        flex: '1 1 auto',
                        textAlign: 'center'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Score Display */}
        <div style={{ 
          flex: '0 0 350px', 
          background: 'var(--bg-primary)', 
          border: `2px solid ${severity.color}50`, 
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          position: 'sticky',
          top: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: `0 0 30px ${severity.color}15`
        }}>
          <ShieldAlert size={48} color={severity.color} style={{ marginBottom: '16px' }} />
          
          <h2 style={{ fontSize: '64px', fontWeight: 800, color: severity.color, margin: '0 0 8px 0', lineHeight: 1 }}>
            {score}
          </h2>
          <div style={{ 
            background: `${severity.color}20`, 
            color: severity.color, 
            padding: '4px 16px', 
            borderRadius: '20px',
            fontSize: '16px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '32px'
          }}>
            {severity.label}
          </div>

          <div style={{ width: '100%', background: 'var(--bg-deep)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700 }}>Vector String</p>
            <p style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all', marginBottom: '16px', lineHeight: 1.5 }}>
              {vectorString}
            </p>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleCopy}
            >
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copied ? 'Copied to Clipboard!' : 'Copy Vector & Score'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
