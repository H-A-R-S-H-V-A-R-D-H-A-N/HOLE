import { Star, Rocket } from 'lucide-react';
import '../styles/Tools.css';

export default function ResourcesPartners() {
  return (
    <div className="tool-page page-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', maxWidth: '500px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(139, 92, 246, 0.15))',
          border: '1px solid rgba(255, 215, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <Rocket size={36} style={{ color: '#FFD700' }} />
        </div>

        <h1 style={{
          fontSize: '28px',
          fontWeight: 900,
          color: 'var(--text-primary)',
          margin: '0 0 8px',
          letterSpacing: '-0.5px',
        }}>
          Coming Soon
        </h1>

        <p style={{
          fontSize: '14px',
          color: 'var(--text-muted)',
          lineHeight: '1.7',
          margin: '0 0 32px',
        }}>
          Curated VPS deals, learning platforms, and essential hacking tools — all with exclusive discounts for the HOLE community.
        </p>

        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          {['DigitalOcean', 'Vultr', 'Hack The Box', 'PentesterLab', 'Caido'].map((name, i) => (
            <span key={i} style={{
              fontSize: '11px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}>
              {name}
            </span>
          ))}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.85; }
          }
        `}</style>
      </div>
    </div>
  );
}
