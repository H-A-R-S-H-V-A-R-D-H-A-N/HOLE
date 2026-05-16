import React, { useState, useMemo } from 'react';
import { Database, Search, Code, CheckCheck, AlertTriangle, ChevronRight, ChevronDown, Zap } from 'lucide-react';
import '../styles/Tools.css';

export default function GraphQLVisualizer() {
  const [rawJson, setRawJson] = useState('');
  const [schema, setSchema] = useState(null);
  const [error, setError] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState({});
  const [selectedField, setSelectedField] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Parse the Introspection JSON
  const handleJsonChange = (val) => {
    setRawJson(val);
    if (!val.trim()) {
      setSchema(null);
      setError(null);
      return;
    }
    
    try {
      const parsed = JSON.parse(val);
      // Support nested "data" wrapper or direct schema
      const schemaData = parsed.data?.__schema || parsed.__schema;
      
      if (!schemaData || !schemaData.types) {
        throw new Error("Invalid Introspection format. Missing __schema.types");
      }
      setSchema(schemaData);
      setError(null);
    } catch (err) {
      setError("Invalid JSON or not a GraphQL Introspection response.");
      setSchema(null);
    }
  };

  const toggleType = (typeName) => {
    setExpandedTypes(prev => ({ ...prev, [typeName]: !prev[typeName] }));
  };

  // Extract root types from schema
  const queryTypeName = schema?.queryType?.name || 'Query';
  const mutationTypeName = schema?.mutationType?.name || 'Mutation';

  const types = useMemo(() => {
    if (!schema || !schema.types) return { queries: [], mutations: [], objects: [] };
    
    const queries = schema.types.find(t => t.name === queryTypeName)?.fields || [];
    const mutations = schema.types.find(t => t.name === mutationTypeName)?.fields || [];
    const objects = schema.types.filter(t => 
      !t.name.startsWith('__') && 
      t.name !== queryTypeName && 
      t.name !== mutationTypeName &&
      t.kind === 'OBJECT'
    ) || [];

    return { queries, mutations, objects };
  }, [schema, queryTypeName, mutationTypeName]);

  // Recursively resolve return type name
  const getTypeName = (typeObj) => {
    if (!typeObj) return 'Unknown';
    if (typeObj.kind === 'NON_NULL') return `${getTypeName(typeObj.ofType)}!`;
    if (typeObj.kind === 'LIST') return `[${getTypeName(typeObj.ofType)}]`;
    return typeObj.name || 'Unknown';
  };

  // Generate a working exploit payload for a specific query/mutation
  const generatePayload = (field, operationType) => {
    let queryStr = `${operationType.toLowerCase()} {\n  ${field.name}`;
    
    // Add arguments
    if (field.args && field.args.length > 0) {
      const argsStr = field.args.map(arg => {
        let dummyValue = '""';
        const typeStr = getTypeName(arg.type);
        if (typeStr.includes('Int')) dummyValue = '1';
        if (typeStr.includes('Boolean')) dummyValue = 'true';
        if (typeStr.includes('ID')) dummyValue = '"1"';
        return `${arg.name}: ${dummyValue}`;
      }).join(', ');
      queryStr += `(${argsStr})`;
    }
    
    // Attempt to add a smart return block
    const returnType = getTypeName(field.type).replace(/\[|\]|!/g, '');
    let returnFields = '__typename\n    id'; // most objects have an id
    
    // If it returns a scalar, it shouldn't have a selection set
    const isScalar = ['String', 'Int', 'Boolean', 'ID', 'Float'].includes(returnType);
    
    if (isScalar) {
      queryStr += `\n}`;
    } else {
      queryStr += ` {\n    ${returnFields}\n  }\n}`;
    }

    // Format as proper JSON POST body
    const jsonBody = JSON.stringify({ query: queryStr }, null, 2);
    return jsonBody;
  };

  const handleFieldSelect = (field, opType) => {
    setSelectedField({
      ...field,
      operationType: opType,
      payload: generatePayload(field, opType)
    });
  };

  const copyPayload = () => {
    if (selectedField?.payload) {
      navigator.clipboard.writeText(selectedField.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter fields based on search
  const filterFields = (fields) => {
    if (!searchQuery) return fields;
    return fields.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const renderFieldList = (fields, opType, colorClass) => {
    const filtered = filterFields(fields);
    if (filtered.length === 0) return <div style={{ padding: '8px 24px', color: 'var(--text-muted)', fontSize: '12px' }}>No matches found</div>;
    
    return filtered.map(field => (
      <div 
        key={field.name} 
        onClick={() => handleFieldSelect(field, opType)}
        style={{ 
          padding: '8px 24px', 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between',
          background: selectedField?.name === field.name ? 'var(--bg-tertiary)' : 'transparent',
          borderLeft: selectedField?.name === field.name ? `2px solid ${colorClass}` : '2px solid transparent',
        }}
        className="hover-bg"
      >
        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{field.name}</span>
        <span style={{ fontSize: '12px', color: colorClass, fontFamily: 'var(--font-mono)' }}>{getTypeName(field.type)}</span>
      </div>
    ));
  };

  return (
    <div className="tool-page page-enter" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="tool-header" style={{ flexShrink: 0 }}>
        <div className="tool-header-left">
          <Database size={28} />
          <div>
            <h1 className="tool-title">GraphQL Visualizer</h1>
            <p className="tool-subtitle">Parse Introspection JSON to uncover hidden APIs and generate payloads</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#EF4444', flexShrink: 0
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {!schema && (
        <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={14} style={{ color: 'var(--accent-primary)' }} />
            How to Exploit GraphQL Introspection
          </h3>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            When developers accidentally leave "Introspection" enabled, the server leaks its entire database blueprint. 
            This tool parses that blueprint with <strong>zero false positives</strong> because it reads the exact mathematical rules directly from the server.
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li><strong>Step 1:</strong> Send an Introspection Query to a target (like <code>/graphql</code>) and paste the massive JSON response below.</li>
            <li><strong>Step 2:</strong> Click on a <strong>Mutation</strong> (an action that changes data) in the left panel.</li>
            <li><strong>Step 3:</strong> We will automatically generate the exact JSON HTTP POST body for that attack. Copy it, paste it into Burp Suite Repeater, and send it to the target!</li>
          </ul>
        </div>
      )}

      {!schema ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label className="tool-label">PASTE RAW INTROSPECTION JSON</label>
          <textarea
            className="tool-input"
            value={rawJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder='{"data": {"__schema": {"queryType": ...'
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px', resize: 'none' }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
          
          {/* Left Panel: Tree View */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 'var(--radius-lg)', 
            overflow: 'hidden' 
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="recondb-search" style={{ margin: 0, flex: 1 }}>
                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                <input 
                  className="recondb-search-input" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Search queries, mutations..." 
                  style={{ fontSize: '12px' }}
                />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSchema(null); setRawJson(''); setSelectedField(null); }}>Clear</button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              
              {/* Queries */}
              <div>
                <div 
                  onClick={() => toggleType('queries')} 
                  style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--accent-blue)' }}
                >
                  {expandedTypes['queries'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  Queries ({types.queries.length})
                </div>
                {expandedTypes['queries'] && renderFieldList(types.queries, 'Query', 'var(--accent-blue)')}
              </div>

              {/* Mutations */}
              <div style={{ marginTop: '8px' }}>
                <div 
                  onClick={() => toggleType('mutations')} 
                  style={{ padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--accent-red)' }}
                >
                  {expandedTypes['mutations'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  Mutations ({types.mutations.length})
                </div>
                {expandedTypes['mutations'] && renderFieldList(types.mutations, 'Mutation', 'var(--accent-red)')}
              </div>

            </div>
          </div>

          {/* Right Panel: Details & Payload Generator */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '20px',
            overflowY: 'auto'
          }}>
            {selectedField ? (
              <>
                <h2 style={{ margin: '0 0 4px', fontSize: '18px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedField.name}
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', display: 'flex', gap: '8px' }}>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    background: selectedField.operationType === 'Mutation' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: selectedField.operationType === 'Mutation' ? '#EF4444' : '#3B82F6',
                    fontWeight: 'bold'
                  }}>
                    {selectedField.operationType}
                  </span>
                  <span>Returns: <strong style={{ color: 'var(--text-primary)' }}>{getTypeName(selectedField.type)}</strong></span>
                </div>

                {selectedField.description && (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                    {selectedField.description}
                  </p>
                )}

                <h3 style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)' }}>ARGUMENTS</h3>
                {selectedField.args && selectedField.args.length > 0 ? (
                  <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '24px' }}>
                    {selectedField.args.map(arg => (
                      <div key={arg.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                        <div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-yellow)' }}>{arg.name}</span>
                          {arg.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{arg.description}</div>}
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{getTypeName(arg.type)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>No arguments required.</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} style={{ color: 'var(--accent-green)' }} /> 
                    READY-TO-EXPLOIT PAYLOAD
                  </h3>
                  <button className="btn btn-primary btn-sm" onClick={copyPayload} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {copied ? <CheckCheck size={14} /> : <Code size={14} />} {copied ? 'Copied!' : 'Copy Query'}
                  </button>
                </div>
                
                <textarea
                  className="tool-input"
                  value={selectedField.payload}
                  readOnly
                  style={{ 
                    flex: 1, 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '13px', 
                    color: 'var(--accent-green)',
                    background: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    resize: 'none'
                  }}
                />
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Search size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                <p>Select a Query or Mutation from the left panel to inspect it and generate an exploit payload.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
