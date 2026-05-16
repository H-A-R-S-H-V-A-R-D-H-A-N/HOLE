import { useState, useEffect } from 'react';
import { Key, Globe, ShieldAlert, Zap, RefreshCw, AlertTriangle, ExternalLink, Activity, Target, Shield, BookOpen } from 'lucide-react';
import { fetchPlatformApi } from '../utils/fileSystem';
import '../styles/Settings.css'; // Reuse some settings styles
import '../styles/Dashboard.css';

const platformConfig = {
  hackerone: {
    name: 'HackerOne',
    icon: Globe,
    color: '#33DEFF',
    endpoints: {
      programs: 'https://api.hackerone.com/v1/hackers/programs?page[size]=100',
    },
    getHeaders: (key) => ({
      'Authorization': `Basic ${btoa(key)}`, // Expecting identifier:token
      'Accept': 'application/json'
    })
  },
  bugcrowd: {
    name: 'Bugcrowd',
    icon: ShieldAlert,
    color: '#FF6B6B',
    endpoints: {
      programs: 'https://api.bugcrowd.com/programs',
    },
    getHeaders: (key) => ({
      'Authorization': `Token ${key}`,
      'Accept': 'application/vnd.bugcrowd+json'
    })
  },
  intigriti: {
    name: 'Intigriti',
    icon: Zap,
    color: '#93C5FD',
    endpoints: {
      programs: 'https://api.intigriti.com/external/researcher/v1/programs',
    },
    getHeaders: (key) => ({
      'Authorization': `Bearer ${key}`,
      'Accept': 'application/json'
    })
  }
};

export default function PlatformDashboard({ platformId, settings, onSettingsChange }) {
  const config = platformConfig[platformId];
  const apiKey = settings.apiKeys?.[platformId];
  const [inputKey, setInputKey] = useState('');

  const [activeTab, setActiveTab] = useState('programs');
  const [data, setData] = useState({ programs: null, reports: null, profile: null, hacktivity: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [programDetails, setProgramDetails] = useState(null);

  useEffect(() => {
    // Reset state when platform changes
    setData({ programs: null, reports: null, profile: null, hacktivity: null });
    setError('');
    setSelectedProgram(null);
    if (apiKey) {
      fetchData('programs');
    }
  }, [platformId, apiKey]);

  const saveKey = () => {
    if (!inputKey.trim()) return;
    
    if (platformId === 'hackerone' && !inputKey.includes(':')) {
      alert("HackerOne requires your API Identifier AND your API Token, separated by a colon.\n\nFormat:  api_identifier:api_token\n\nPlease check your HackerOne settings and try again.");
      return;
    }

    const currentKeys = settings.apiKeys || {};
    const updatedSettings = { ...settings, apiKeys: { ...currentKeys, [platformId]: inputKey.trim() } };
    onSettingsChange(updatedSettings);
    localStorage.setItem('kroma_settings', JSON.stringify(updatedSettings));
    setInputKey('');
  };

  const removeKey = () => {
    const currentKeys = settings.apiKeys || {};
    const updatedKeys = { ...currentKeys };
    delete updatedKeys[platformId];
    const updatedSettings = { ...settings, apiKeys: updatedKeys };
    onSettingsChange(updatedSettings);
    localStorage.setItem('kroma_settings', JSON.stringify(updatedSettings));
    setData({ programs: null, reports: null, profile: null, hacktivity: null });
    setSelectedProgram(null);
  };

  const fetchData = async (tab) => {
    if (!apiKey || !config.endpoints[tab]) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await fetchPlatformApi(config.endpoints[tab], {
        headers: config.getHeaders(apiKey)
      });
      
      if (result.success && result.status >= 200 && result.status < 300) {
        setData(prev => ({ ...prev, [tab]: result.data }));
      } else {
        if (result.status === 401 || result.status === 403) {
          if (platformId === 'hackerone') {
            setError(`Authentication failed (HTTP ${result.status}). Ensure you used your API Identifier (NOT your username) and API Token. Format: "identifier:token".`);
          } else {
            setError(`Authentication failed (HTTP ${result.status}). Please check your API key.`);
          }
        } else {
          setError(`API Error: ${result.status} ${result.error || ''}`);
        }
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    if (!data[activeTab]?.links?.next) return;
    setLoading(true);
    try {
      const result = await fetchPlatformApi(data[activeTab].links.next, {
        headers: config.getHeaders(apiKey)
      });
      if (result.success && result.status >= 200 && result.status < 300) {
        setData(prev => {
          const prevDataArray = Array.isArray(prev[activeTab].data) ? prev[activeTab].data : prev[activeTab];
          const newDataArray = Array.isArray(result.data.data) ? result.data.data : result.data;
          return {
            ...prev,
            [activeTab]: {
              ...result.data,
              data: [...prevDataArray, ...newDataArray]
            }
          };
        });
      } else {
        setError(`Failed to load more: ${result.status}`);
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    }
    setLoading(false);
  };

  const fetchProgramDetails = async (handle) => {
    if (platformId !== 'hackerone') return; // Only implemented for HackerOne currently
    setLoading(true);
    setProgramDetails(null);
    try {
      const result = await fetchPlatformApi(`https://api.hackerone.com/v1/hackers/programs/${handle}`, {
        headers: config.getHeaders(apiKey)
      });
      if (result.success) {
        setProgramDetails(result.data);
      } else {
        setError(`Could not fetch details for ${handle}`);
      }
    } catch (err) {
      setError(`Error fetching details: ${err.message}`);
    }
    setLoading(false);
  };

  if (!config) return <div>Invalid platform</div>;
  const Icon = config.icon;

  if (!apiKey) {
    return (
      <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `rgba(255,255,255,0.05)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <Icon size={40} color={config.color} />
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Connect {config.name}</h1>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px', marginBottom: '32px', lineHeight: 1.6 }}>
          Enter your API key or token to connect your {config.name} account to KROMA. Your key is stored securely on your local machine.
        </p>
        <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '400px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="password" 
              placeholder={platformId === 'hackerone' ? "identifier:token" : "API Token..."}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 36px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <button className="btn btn-primary" onClick={saveKey}>Connect</button>
        </div>
        {platformId === 'hackerone' && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
            Format: <code>username:api_token</code>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${config.color}40` }}>
            <Icon size={24} color={config.color} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {config.name}
              <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: '100px', fontWeight: 600 }}>Connected</span>
            </h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => fetchData(activeTab)} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-secondary" onClick={removeKey} style={{ color: 'var(--accent-red)' }}>
            Disconnect
          </button>
        </div>
      </div>

      {/* Content Area */}

      {/* Content Area */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {error && (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        {loading && !data[activeTab] ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin" />
          </div>
        ) : (
          <div>
            {/* --- Programs Tab --- */}
            {activeTab === 'programs' && data.programs && (
              selectedProgram ? (
                <div className="program-details page-enter">
                  <button className="btn btn-secondary" onClick={() => setSelectedProgram(null)} style={{ marginBottom: '20px' }}>
                    &larr; Back to Programs
                  </button>
                  <div className="dashboard-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '24px', margin: 0 }}>{selectedProgram.attributes?.name || selectedProgram.name}</h2>
                      {selectedProgram.attributes?.offers_bounties && <span className="badge badge-high">Offers Bounties</span>}
                    </div>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                      {selectedProgram.attributes?.about || selectedProgram.description}
                    </p>
                    
                    <h3 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '16px' }}>Scopes</h3>
                    {loading && !programDetails ? (
                      <div style={{ padding: '20px', textAlign: 'center' }}><RefreshCw className="spin" /></div>
                    ) : (
                      programDetails?.relationships?.structured_scopes?.data?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {programDetails.relationships.structured_scopes.data.map((scope, idx) => (
                            <div key={idx} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', borderLeft: `3px solid ${scope.attributes?.eligible_for_bounty ? 'var(--accent-green)' : 'var(--text-muted)'}` }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{scope.attributes?.asset_identifier}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Type: {scope.attributes?.asset_type} | 
                                Bounty: {scope.attributes?.eligible_for_bounty ? 'Yes' : 'No'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No specific scope details available or not fetched yet.</div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {(Array.isArray(data.programs.data) ? data.programs.data : Array.isArray(data.programs) ? data.programs : []).map((prog, i) => (
                      <div 
                        key={i} 
                        className="dashboard-card" 
                        style={{ padding: '20px', cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedProgram(prog);
                          if (platformId === 'hackerone' && prog.attributes?.handle) {
                            fetchProgramDetails(prog.attributes.handle);
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            {prog.attributes?.name || prog.name || 'Unknown Program'}
                          </h3>
                          {prog.attributes?.offers_bounties && <span className="badge badge-high" style={{ fontSize: '10px' }}>$$$</span>}
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {prog.attributes?.about || prog.description || 'No description provided.'}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Target size={14}/> {prog.attributes?.scopes_count || 0} Scopes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {data.programs?.links?.next && (
                    <div style={{ textAlign: 'center', marginTop: '32px' }}>
                      <button className="btn btn-secondary" onClick={loadMore} disabled={loading}>
                        {loading ? <RefreshCw className="spin" size={16} /> : 'Load More Programs'}
                      </button>
                    </div>
                  )}
                </>
              )
            )}

            {/* --- Reports Tab --- */}
            {activeTab === 'reports' && data.reports && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                  {(Array.isArray(data.reports.data) ? data.reports.data : []).map((rep, i) => (
                    <div key={i} className="dashboard-card" style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                        {rep.attributes?.title || `Report #${rep.id}`}
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="badge badge-info">{rep.attributes?.state || 'Unknown'}</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
                          {rep.attributes?.bounty_amount ? `$${rep.attributes.bounty_amount}` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {data.reports?.links?.next && (
                  <div style={{ textAlign: 'center', marginTop: '32px' }}>
                    <button className="btn btn-secondary" onClick={loadMore} disabled={loading}>
                      {loading ? <RefreshCw className="spin" size={16} /> : 'Load More Reports'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* --- Hacktivity Tab --- */}
            {activeTab === 'hacktivity' && data.hacktivity && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(Array.isArray(data.hacktivity.data) ? data.hacktivity.data : []).map((item, i) => (
                    <div key={i} className="dashboard-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                          {item.attributes?.title || `Report #${item.id}`}
                        </h3>
                        {item.attributes?.bounty_amount && (
                          <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
                            ${item.attributes.bounty_amount}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                        <span>Reported by: <span style={{ color: 'var(--accent-primary)' }}>{item.relationships?.reporter?.data?.attributes?.username || 'Unknown'}</span></span>
                        {item.attributes?.disclosed_at && (
                          <span>Disclosed: {new Date(item.attributes.disclosed_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {data.hacktivity?.links?.next && (
                  <div style={{ textAlign: 'center', marginTop: '32px' }}>
                    <button className="btn btn-secondary" onClick={loadMore} disabled={loading}>
                      {loading ? <RefreshCw className="spin" size={16} /> : 'Load More Activity'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* --- Profile Tab --- */}
            {activeTab === 'profile' && data.profile && (
              <div className="dashboard-card" style={{ padding: '32px', maxWidth: '600px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                    {data.profile.data?.attributes?.profile_picture_urls?.medium && (
                      <img src={data.profile.data.attributes.profile_picture_urls.medium} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '24px' }}>{data.profile.data?.attributes?.name || 'Researcher'}</h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>@{data.profile.data?.attributes?.username}</p>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Reputation</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {data.profile.data?.attributes?.reputation || 0}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Rank</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B' }}>
                      #{data.profile.data?.attributes?.rank || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
