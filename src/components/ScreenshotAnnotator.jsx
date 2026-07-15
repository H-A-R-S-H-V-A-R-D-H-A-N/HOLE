import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Circle, ArrowRight, Square, Eraser, Copy, CheckCheck, Trash2, Upload, Download, Undo2, Layers, MousePointer2, Minus, Type, Highlighter, Pencil, EyeOff, Redo2 } from 'lucide-react';
import '../styles/Tools.css';

export default function ScreenshotAnnotator() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const scaleRef = useRef(1);
  const [tool, setTool] = useState('rect'); 
  const [color, setColor] = useState('#EF4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [undoneAnnotations, setUndoneAnnotations] = useState([]);
  const [copied, setCopied] = useState(false);
  const [tempAnnotation, setTempAnnotation] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(-1);
  const [freehandPoints, setFreehandPoints] = useState([]);
  const [textInput, setTextInput] = useState({ active: false, x: 0, y: 0, value: '' });
  const textInputRef = useRef(null);
  const presetColors = ['#EF4444','#F97316','#FACC15','#22C55E','#3B82F6','#8B5CF6','#EC4899','#000000','#FFFFFF'];

  const loadImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setAnnotations([]);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
    e.target.value = '';
  };

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) loadImage(file);
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    
    // Set canvas to match the container width, scale image to fit
    const container = canvas.parentElement;
    const maxW = container ? container.clientWidth - 4 : 800;
    const maxH = window.innerHeight - 300;
    
    let scale = 1;
    if (image.width > maxW || image.height > maxH) {
      scale = Math.min(maxW / image.width, maxH / image.height);
    }
    scaleRef.current = scale;
    
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    const all = tempAnnotation ? [...annotations, tempAnnotation] : annotations;
    
    all.forEach(a => {
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.lineWidth = a.strokeWidth || Math.max(3, canvas.width / 300);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (a.tool === 'circle') {
        const rx = Math.abs(a.ex - a.sx) / 2;
        const ry = Math.abs(a.ey - a.sy) / 2;
        const cx = (a.sx + a.ex) / 2;
        const cy = (a.sy + a.ey) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (a.tool === 'rect') {
        ctx.strokeRect(a.sx, a.sy, a.ex - a.sx, a.ey - a.sy);
      } else if (a.tool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(a.ex, a.ey);
        ctx.stroke();
        const angle = Math.atan2(a.ey - a.sy, a.ex - a.sx);
        const headLen = Math.max(15, canvas.width / 40);
        ctx.beginPath();
        ctx.moveTo(a.ex, a.ey);
        ctx.lineTo(a.ex - headLen * Math.cos(angle - Math.PI / 6), a.ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(a.ex - headLen * Math.cos(angle + Math.PI / 6), a.ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (a.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(a.ex, a.ey);
        ctx.stroke();
      } else if (a.tool === 'freehand' && a.points && a.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(a.points[0].x, a.points[0].y);
        for (let i = 1; i < a.points.length; i++) {
          ctx.lineTo(a.points[i].x, a.points[i].y);
        }
        ctx.stroke();
      } else if (a.tool === 'highlight') {
        const bx = Math.min(a.sx, a.ex), by = Math.min(a.sy, a.ey);
        const bw = Math.abs(a.ex - a.sx), bh = Math.abs(a.ey - a.sy);
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillRect(bx, by, bw, bh);
        ctx.restore();
      } else if (a.tool === 'redact') {
        const bx = Math.min(a.sx, a.ex), by = Math.min(a.sy, a.ey);
        const bw = Math.abs(a.ex - a.sx), bh = Math.abs(a.ey - a.sy);
        ctx.fillRect(bx, by, bw, bh);
      } else if (a.tool === 'text' && a.text) {
        const fontSize = Math.max(16, (a.strokeWidth || 3) * 6);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillText(a.text, a.sx, a.sy);
      } else if (a.tool === 'blur') {
        const bx = Math.min(a.sx, a.ex), by = Math.min(a.sy, a.ey);
        const bw = Math.abs(a.ex - a.sx), bh = Math.abs(a.ey - a.sy);
        if (bw > 5 && bh > 5) {
          const pixelSize = Math.max(10, canvas.width / 50);
          const imgData = ctx.getImageData(bx, by, bw, bh);
          for (let py = 0; py < bh; py += pixelSize) {
            for (let px = 0; px < bw; px += pixelSize) {
              let r = 0, g = 0, b = 0, count = 0;
              for (let dy = 0; dy < pixelSize && py + dy < bh; dy++) {
                for (let dx = 0; dx < pixelSize && px + dx < bw; dx++) {
                  const idx = ((Math.floor(py + dy)) * Math.floor(bw) + Math.floor(px + dx)) * 4;
                  if (idx + 2 < imgData.data.length) {
                    r += imgData.data[idx]; g += imgData.data[idx+1]; b += imgData.data[idx+2]; count++;
                  }
                }
              }
              if (count > 0) {
                ctx.fillStyle = `rgb(${Math.round(r/count)},${Math.round(g/count)},${Math.round(b/count)})`;
                ctx.fillRect(bx + px, by + py, pixelSize, pixelSize);
              }
            }
          }
        }
      }
    });
  }, [image, annotations, tempAnnotation]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e) => {
    if (!image) return;
    const pos = getCoords(e);
    
    if (tool === 'select') {
      // Find clicked annotation
      for (let i = annotations.length - 1; i >= 0; i--) {
        const a = annotations[i];
        const minX = Math.min(a.sx, a.ex) - 10;
        const maxX = Math.max(a.sx, a.ex) + 10;
        const minY = Math.min(a.sy, a.ey) - 10;
        const maxY = Math.max(a.sy, a.ey) + 10;
        
        if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
          setDraggingIndex(i);
          setStartPos(pos);
          setIsDrawing(true);
          return;
        }
      }
      return;
    }

    if (tool === 'text') {
      setTextInput({ active: true, x: pos.x, y: pos.y, value: '' });
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }
    setIsDrawing(true);
    setStartPos(pos);
    if (tool === 'freehand') setFreehandPoints([pos]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPos) return;
    const pos = getCoords(e);
    
    if (tool === 'select' && draggingIndex >= 0) {
      const dx = pos.x - startPos.x;
      const dy = pos.y - startPos.y;
      
      const updated = [...annotations];
      const a = updated[draggingIndex];
      updated[draggingIndex] = { ...a, sx: a.sx + dx, sy: a.sy + dy, ex: a.ex + dx, ey: a.ey + dy };
      
      setAnnotations(updated);
      setStartPos(pos);
      return;
    }

    if (tool === 'freehand') {
      setFreehandPoints(prev => [...prev, pos]);
      setTempAnnotation({ tool, color, strokeWidth, points: [...freehandPoints, pos] });
      return;
    }
    setTempAnnotation({ tool, color, strokeWidth, sx: startPos.x, sy: startPos.y, ex: pos.x, ey: pos.y });
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    
    if (tool === 'select') {
      setIsDrawing(false);
      setStartPos(null);
      setDraggingIndex(-1);
      return;
    }

    const pos = getCoords(e);
    if (tool === 'freehand' && freehandPoints.length > 1) {
      setAnnotations(prev => [...prev, { tool, color, strokeWidth, points: [...freehandPoints, pos] }]);
      setUndoneAnnotations([]);
      setFreehandPoints([]);
    } else if (startPos && (Math.abs(startPos.x - pos.x) > 2 || Math.abs(startPos.y - pos.y) > 2)) {
      setAnnotations(prev => [...prev, { tool, color, strokeWidth, sx: startPos.x, sy: startPos.y, ex: pos.x, ey: pos.y }]);
      setUndoneAnnotations([]);
    }
    setIsDrawing(false);
    setStartPos(null);
    setTempAnnotation(null);
  };

  const renderFullRes = useCallback(() => {
    if (!image) return null;
    const offscreen = document.createElement('canvas');
    offscreen.width = image.width;
    offscreen.height = image.height;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);
    const s = 1 / scaleRef.current;
    annotations.forEach(a => {
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.lineWidth = (a.strokeWidth || 3) * s;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (a.tool === 'circle') {
        const rx = Math.abs(a.ex - a.sx) / 2 * s, ry = Math.abs(a.ey - a.sy) / 2 * s;
        const cx = (a.sx + a.ex) / 2 * s, cy = (a.sy + a.ey) / 2 * s;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (a.tool === 'rect') {
        ctx.strokeRect(a.sx * s, a.sy * s, (a.ex - a.sx) * s, (a.ey - a.sy) * s);
      } else if (a.tool === 'arrow') {
        ctx.beginPath(); ctx.moveTo(a.sx * s, a.sy * s); ctx.lineTo(a.ex * s, a.ey * s); ctx.stroke();
        const angle = Math.atan2(a.ey - a.sy, a.ex - a.sx);
        const headLen = Math.max(15, image.width / 40);
        ctx.beginPath(); ctx.moveTo(a.ex * s, a.ey * s);
        ctx.lineTo(a.ex * s - headLen * Math.cos(angle - Math.PI / 6), a.ey * s - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(a.ex * s - headLen * Math.cos(angle + Math.PI / 6), a.ey * s - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath(); ctx.fill();
      } else if (a.tool === 'line') {
        ctx.beginPath(); ctx.moveTo(a.sx * s, a.sy * s); ctx.lineTo(a.ex * s, a.ey * s); ctx.stroke();
      } else if (a.tool === 'freehand' && a.points && a.points.length > 1) {
        ctx.beginPath(); ctx.moveTo(a.points[0].x * s, a.points[0].y * s);
        for (let i = 1; i < a.points.length; i++) ctx.lineTo(a.points[i].x * s, a.points[i].y * s);
        ctx.stroke();
      } else if (a.tool === 'highlight') {
        const bx = Math.min(a.sx, a.ex) * s, by = Math.min(a.sy, a.ey) * s;
        ctx.save(); ctx.globalAlpha = 0.3;
        ctx.fillRect(bx, by, Math.abs(a.ex - a.sx) * s, Math.abs(a.ey - a.sy) * s);
        ctx.restore();
      } else if (a.tool === 'redact') {
        const bx = Math.min(a.sx, a.ex) * s, by = Math.min(a.sy, a.ey) * s;
        ctx.fillRect(bx, by, Math.abs(a.ex - a.sx) * s, Math.abs(a.ey - a.sy) * s);
      } else if (a.tool === 'text' && a.text) {
        const fontSize = Math.max(16, (a.strokeWidth || 3) * 6) * s;
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillText(a.text, a.sx * s, a.sy * s);
      } else if (a.tool === 'blur') {
        const bx = Math.min(a.sx, a.ex) * s, by = Math.min(a.sy, a.ey) * s;
        const bw = Math.abs(a.ex - a.sx) * s, bh = Math.abs(a.ey - a.sy) * s;
        if (bw > 5 && bh > 5) {
          const pixelSize = Math.max(10, image.width / 50);
          const imgData = ctx.getImageData(bx, by, bw, bh);
          for (let py = 0; py < bh; py += pixelSize) {
            for (let px = 0; px < bw; px += pixelSize) {
              let r = 0, g = 0, b = 0, count = 0;
              for (let dy = 0; dy < pixelSize && py + dy < bh; dy++) {
                for (let dx = 0; dx < pixelSize && px + dx < bw; dx++) {
                  const idx = (Math.floor(py + dy) * Math.floor(bw) + Math.floor(px + dx)) * 4;
                  if (idx + 2 < imgData.data.length) { r += imgData.data[idx]; g += imgData.data[idx+1]; b += imgData.data[idx+2]; count++; }
                }
              }
              if (count > 0) { ctx.fillStyle = `rgb(${Math.round(r/count)},${Math.round(g/count)},${Math.round(b/count)})`; ctx.fillRect(bx + px, by + py, pixelSize, pixelSize); }
            }
          }
        }
      }
    });
    return offscreen;
  }, [image, annotations]);

  const handleCopyToClipboard = async () => {
    const fullRes = renderFullRes();
    if (!fullRes) return;
    try {
      const blob = await new Promise(resolve => fullRes.toBlob(resolve, 'image/png', 1.0));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Error copying to clipboard.');
    }
  };

  const handleDownload = () => {
    const fullRes = renderFullRes();
    if (!fullRes) return;
    const a = document.createElement('a');
    a.href = fullRes.toDataURL('image/png');
    a.download = `HOLE_annotation_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="tool-page page-enter">
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileSelect} />
      <div className="tool-header">
        <div className="tool-header-left">
          <div className="pro-icon-glow">
            <Camera size={28} color="var(--accent-primary)" />
          </div>
          <div>
            <h1 className="tool-title">PRO ANNOTATOR</h1>
            <p className="tool-subtitle">Pixel-perfect screenshot markup and privacy redaction.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Import Image
          </button>
          {image && (
            <button className="btn btn-ghost" onClick={() => { setImage(null); setAnnotations([]); }} style={{ color: '#EF4444' }}>
              <Trash2 size={16} /> Reset
            </button>
          )}
        </div>
      </div>

      {!image ? (
        <div className="pro-dropzone" onClick={() => fileInputRef.current?.click()}>
          <div className="pro-icon-glow" style={{ marginBottom: '16px' }}>
            <Layers size={48} color="var(--accent-primary)" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '0.5px' }}>No Image Loaded</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>Paste from clipboard (Ctrl+V) or drop a file here to begin</p>
        </div>
      ) : (
        <div className="pro-annotator-layout">
          <div className="pro-annotator-sidebar">
            <div className="pro-tool-group">
              {[
                { id: 'select', icon: MousePointer2, label: 'Select / Move' },
                { id: 'rect', icon: Square, label: 'Box Outline' },
                { id: 'circle', icon: Circle, label: 'Circle Outline' },
                { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
                { id: 'line', icon: Minus, label: 'Line' },
                { id: 'freehand', icon: Pencil, label: 'Freehand Draw' },
                { id: 'text', icon: Type, label: 'Text Label' },
                { id: 'highlight', icon: Highlighter, label: 'Highlight' },
                { id: 'redact', icon: EyeOff, label: 'Redact / Hide' },
                { id: 'blur', icon: Eraser, label: 'Pixelate / Blur' },
              ].map(t => (
                <button 
                  key={t.id} 
                  className={`pro-tool-btn ${tool === t.id ? 'active' : ''}`}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                >
                  <t.icon size={18} />
                </button>
              ))}
            </div>
            <div className="pro-tool-sep" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '0 6px' }}>
              <label style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Color</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                {presetColors.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: '14px', height: '14px', borderRadius: '50%', background: c, border: color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', transform: color === c ? 'scale(1.25)' : 'scale(1)', transition: 'all 0.15s', padding: 0 }} />
                ))}
              </div>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: '32px', height: '22px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }} title="Custom color" />
            </div>
            <div className="pro-tool-sep" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '0 6px' }}>
              <label style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Size</label>
              <input type="range" min="1" max="10" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} style={{ width: '40px', accentColor: 'var(--accent-primary)' }} title={`Stroke: ${strokeWidth}`} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{strokeWidth}px</span>
            </div>
            <div className="pro-tool-sep" />
            <button className="pro-tool-btn" onClick={() => { setAnnotations(prev => { const last = prev[prev.length - 1]; if (last) setUndoneAnnotations(p => [...p, last]); return prev.slice(0, -1); }); }} disabled={annotations.length === 0} title="Undo">
              <Undo2 size={18} />
            </button>
            <button className="pro-tool-btn" onClick={() => { setUndoneAnnotations(prev => { const last = prev[prev.length - 1]; if (last) setAnnotations(p => [...p, last]); return prev.slice(0, -1); }); }} disabled={undoneAnnotations.length === 0} title="Redo">
              <Redo2 size={18} />
            </button>
          </div>

          <div className="pro-canvas-container">
            <div className="pro-canvas-wrapper" style={{ position: 'relative' }}>
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { if (isDrawing && tool === 'freehand' && freehandPoints.length > 1) { setAnnotations(prev => [...prev, { tool, color, strokeWidth, points: freehandPoints }]); setFreehandPoints([]); setIsDrawing(false); setTempAnnotation(null); } }}
                style={{ cursor: tool === 'text' ? 'text' : tool === 'select' ? 'default' : 'crosshair', display: 'block' }}
              />
              {textInput.active && (
                <input
                  ref={textInputRef}
                  type="text"
                  value={textInput.value}
                  onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textInput.value.trim()) {
                      setAnnotations(prev => [...prev, { tool: 'text', color, strokeWidth, sx: textInput.x, sy: textInput.y, text: textInput.value.trim() }]);
                      setUndoneAnnotations([]);
                      setTextInput({ active: false, x: 0, y: 0, value: '' });
                    } else if (e.key === 'Escape') {
                      setTextInput({ active: false, x: 0, y: 0, value: '' });
                    }
                  }}
                  onBlur={() => {
                    if (textInput.value.trim()) {
                      setAnnotations(prev => [...prev, { tool: 'text', color, strokeWidth, sx: textInput.x, sy: textInput.y, text: textInput.value.trim() }]);
                      setUndoneAnnotations([]);
                    }
                    setTextInput({ active: false, x: 0, y: 0, value: '' });
                  }}
                  style={{ position: 'absolute', left: textInput.x + 'px', top: (textInput.y - 20) + 'px', background: 'rgba(0,0,0,0.8)', color: color, border: '1px solid ' + color, borderRadius: '4px', padding: '4px 8px', fontSize: '14px', fontWeight: 'bold', fontFamily: 'Inter, sans-serif', outline: 'none', zIndex: 10, minWidth: '120px' }}
                  placeholder="Type and press Enter"
                />
              )}
            </div>
            <div className="pro-canvas-footer">
               <button className="btn btn-secondary" onClick={handleDownload} style={{ padding: '8px 16px' }}>
                <Download size={16} /> Save PNG
              </button>
              <button className="btn btn-primary" onClick={handleCopyToClipboard} style={{ padding: '8px 16px' }}>
                {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pro-dropzone {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px dashed var(--border-subtle);
          border-radius: 16px;
          min-height: 400px;
          background: #0A0A0A;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
        }
        .pro-dropzone:hover { border-color: var(--accent-primary); }
        .pro-annotator-layout {
          display: flex;
          gap: 16px;
          height: calc(100vh - 200px);
        }
        .pro-annotator-sidebar {
          width: 60px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 0;
          gap: 16px;
        }
        .pro-tool-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: none;
          background: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .pro-tool-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .pro-tool-btn.active { background: var(--accent-primary-dim); color: var(--accent-primary); border: 1px solid var(--accent-primary-glow); }
        .pro-color-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .pro-color-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
        .pro-color-dot.active { border-color: #888; transform: scale(1.2); }
        .pro-tool-sep { width: 30px; height: 1px; background: var(--border-subtle); }
        .pro-canvas-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }
        .pro-canvas-wrapper {
          flex: 1;
          background: #000;
          border-radius: 12px;
          border: 1px solid var(--border-subtle);
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pro-canvas-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}
