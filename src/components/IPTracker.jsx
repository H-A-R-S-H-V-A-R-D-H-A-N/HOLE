import React, { useState } from 'react';
import { MapPin, Search, Shield, Server, Globe, Wifi, Copy, CheckCircle2, Radio, Clock, Building2, Hash, Eye } from 'lucide-react';

const PORT_SERVICES = {
  21:'FTP', 22:'SSH', 23:'Telnet', 25:'SMTP', 53:'DNS', 80:'HTTP', 110:'POP3',
  135:'RPC', 139:'NetBIOS', 143:'IMAP', 443:'HTTPS', 445:'SMB', 993:'IMAPS',
  995:'POP3S', 1433:'MSSQL', 1521:'Oracle', 3306:'MySQL', 3389:'RDP',
  5432:'PostgreSQL', 5900:'VNC', 6379:'Redis', 8080:'HTTP-Alt', 8443:'HTTPS-Alt',
  9200:'Elasticsearch', 27017:'MongoDB'
};

export default function IPTracker() {
  const [ip, setIp] = useState('');
  const [scanPorts, setScanPorts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!ip.trim()) { setError('Please enter an IP address or domain.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const response = await window.electronAPI.trackIP({ ip: ip.trim(), scanPorts });
      if (response.success) { setResult(response); }
      else { setError(response.error || 'Lookup failed.'); }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleCopy = () => {
    if (!result) return;
    const g = result.geo;
    const lines = [
      `IP: ${g.ip}`, `Location: ${g.city}, ${g.regionName}, ${g.country}`,
      `Coordinates: ${g.lat}, ${g.lon}`, `ISP: ${g.isp}`, `Org: ${g.org}`,
      `AS: ${g.as}`, `Timezone: ${g.timezone}`,
      `Proxy: ${g.proxy}`, `Hosting: ${g.hosting}`, `Mobile: ${g.mobile}`,
    ];
    if (result.dns?.hostname) lines.push(`Hostname: ${result.dns.hostname}`);
    if (result.ports?.length) lines.push(`Open Ports: ${result.ports.join(', ')}`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const InfoRow = ({ icon: Icon, label, value, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
      <Icon size={16} color={color || 'var(--accent-primary)'} />
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '110px' }}>{label}</span>
      <span style={{ fontSize: '14px', color: '#FFF', fontWeight: 600, fontFamily: 'monospace', wordBreak: 'break-all' }}>{value || '—'}</span>
    </div>
  );

  const Badge = ({ label, active, color }) => (
    <span style={{
      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
      backgroundColor: active ? `${color}20` : 'var(--bg-tertiary)',
      color: active ? color : 'var(--text-muted)',
      border: `1px solid ${active ? color + '40' : 'var(--border-subtle)'}`,
    }}>{label}: {active ? 'YES' : 'NO'}</span>
  );

  return (
    <div className="pro-section">
      <div className="pro-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pro-icon-container"><MapPin size={20} color="var(--accent-primary)" /></div>
          <div>
            <h1 className="pro-title">IP Tracker</h1>
            <p className="pro-subtitle">Geolocate any IP address — city, ISP, ASN, coordinates, and open ports</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        <form onSubmit={handleScan} style={{ display: 'flex', gap: '12px', marginBottom: '28px', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>IP Address or Domain</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" className="pro-input" value={ip} onChange={e => setIp(e.target.value)} placeholder="e.g., 8.8.8.8 or example.com" autoFocus style={{ flex: 1 }} />
              <button type="button" onClick={async () => {
                try {
                  const res = await window.electronAPI.getPublicIP();
                  if (res.success) setIp(res.ip);
                  else setError('Could not detect your IP.');
                } catch { setError('Could not detect your IP.'); }
              }} style={{ padding: '0 14px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#3B82F6', cursor: 'pointer', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                My IP
              </button>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: scanPorts ? '#22C55E' : 'var(--text-muted)', border: '1px solid var(--border-subtle)', whiteSpace: 'nowrap', height: '42px' }}>
            <input type="checkbox" checked={scanPorts} onChange={e => setScanPorts(e.target.checked)} style={{ accentColor: '#22C55E' }} />
            <Radio size={14} /> Port Scan
          </label>
          <button type="submit" className="pro-button primary" disabled={loading} style={{ height: '42px', padding: '0 24px', whiteSpace: 'nowrap' }}>
            {loading ? <><span className="pro-spinner"></span>{scanPorts ? 'Scanning...' : 'Tracking...'}</> : <><Search size={16} />Track</>}
          </button>
        </form>

        {error && (
          <div style={{ padding: '16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Shield size={20} /><span style={{ fontSize: '14px' }}>{error}</span>
          </div>
        )}

        {result && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="#22C55E" /> {result.geo.ip}
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 400 }}>— {result.geo.city}, {result.geo.country}</span>
              </h3>
              <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#FFF', cursor: 'pointer', fontSize: '13px' }}>
                {copied ? <CheckCircle2 size={14} color="#22C55E" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy All'}
              </button>
            </div>

            {/* Location */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#3B82F6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={14} /> Location
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '8px' }}>
                <InfoRow icon={Globe} label="Country" value={`${result.geo.country} (${result.geo.countryCode})`} />
                <InfoRow icon={MapPin} label="Region" value={result.geo.regionName} />
                <InfoRow icon={Building2} label="City" value={result.geo.city} />
                <InfoRow icon={Hash} label="Zip Code" value={result.geo.zip} />
                <InfoRow icon={MapPin} label="Coordinates" value={`${result.geo.lat}, ${result.geo.lon}`} color="#F59E0B" />
                <InfoRow icon={Clock} label="Timezone" value={result.geo.timezone} />
              </div>
            </div>

            {/* Network */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#8B5CF6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wifi size={14} /> Network
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '8px' }}>
                <InfoRow icon={Server} label="ISP" value={result.geo.isp} color="#8B5CF6" />
                <InfoRow icon={Building2} label="Organization" value={result.geo.org} color="#8B5CF6" />
                <InfoRow icon={Hash} label="ASN" value={result.geo.as} color="#8B5CF6" />
                {result.dns?.hostname && <InfoRow icon={Globe} label="Hostname" value={result.dns.hostname} color="#8B5CF6" />}
              </div>
            </div>

            {/* Flags */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#F59E0B', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={14} /> Flags
              </h4>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Badge label="Proxy/VPN" active={result.geo.proxy} color="#EF4444" />
                <Badge label="Hosting/DC" active={result.geo.hosting} color="#F59E0B" />
                <Badge label="Mobile" active={result.geo.mobile} color="#3B82F6" />
              </div>
            </div>

            {/* Open Ports */}
            {result.ports && result.ports.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#EF4444', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio size={14} /> Open Ports ({result.ports.length})
                </h4>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {result.ports.map(port => (
                    <div key={port} style={{ padding: '8px 16px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#EF4444', fontSize: '14px' }}>{port}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{PORT_SERVICES[port] || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.ports && result.ports.length === 0 && scanPorts && (
              <div style={{ padding: '16px', backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', color: '#22C55E', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Shield size={18} /> No common ports open — target appears hardened.
              </div>
            )}

            {/* Map Embed */}
            {result.geo.lat && result.geo.lon && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#06B6D4', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} /> Map View
                  </h4>
                  <a href={`https://www.google.com/maps?q=${result.geo.lat},${result.geo.lon}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: '12px', color: '#3B82F6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <Globe size={12} /> Open in Google Maps
                  </a>
                </div>
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-default)', height: '300px', position: 'relative' }}>
                  <iframe
                    title="IP Location Map"
                    width="100%" height="340px" frameBorder="0" style={{ border: 0, marginBottom: '-40px' }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${result.geo.lon-0.05},${result.geo.lat-0.05},${result.geo.lon+0.05},${result.geo.lat+0.05}&layer=mapnik&marker=${result.geo.lat},${result.geo.lon}`}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
