import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Circle, ArrowRight, Square, Eraser, Copy, CheckCheck, Trash2, Upload, Download, Undo2, Layers, MousePointer2 } from 'lucide-react';
import '../styles/Tools.css';

export default function ScreenshotAnnotator() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [tool, setTool] = useState('rect'); 
  const [color, setColor] = useState('#EF4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [copied, setCopied] = useState(false);
  const [tempAnnotation, setTempAnnotation] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(-1);

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
    
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    const all = tempAnnotation ? [...annotations, tempAnnotation] : annotations;
    
    all.forEach(a => {
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.lineWidth = Math.max(3, canvas.width / 300);
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
      } else if (a.tool === 'blur') {
        const bx = Math.min(a.sx, a.ex), by = Math.min(a.sy, a.ey);
        const bw = Math.abs(a.ex - a.sx), bh = Math.abs(a.ey - a.sy);
        if (bw > 5 && bh > 5) {
          const pixelSize = Math.max(8, canvas.width / 60);
          const imgData = ctx.getImageData(bx, by, bw, bh);
          for (let y = 0; y < bh; y += pixelSize) {
            for (let x = 0; x < bw; x += pixelSize) {
              const idx = (Math.floor(y) * Math.floor(bw) + Math.floor(x)) * 4;
              if (idx < imgData.data.length) {
                const r = imgData.data[idx], g = imgData.data[idx + 1], b = imgData.data[idx + 2];
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(bx + x, by + y, pixelSize, pixelSize);
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

    setIsDrawing(true);
    setStartPos(pos);
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

    setTempAnnotation({ tool, color, sx: startPos.x, sy: startPos.y, ex: pos.x, ey: pos.y });
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
    if (startPos && (Math.abs(startPos.x - pos.x) > 2 || Math.abs(startPos.y - pos.y) > 2)) {
      setAnnotations(prev => [...prev, { tool, color, sx: startPos.x, sy: startPos.y, ex: pos.x, ey: pos.y }]);
    }
    setIsDrawing(false);
    setStartPos(null);
    setTempAnnotation(null);
  };

  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Error copying to clipboard.');
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `kroma_annotation_${Date.now()}.png`;
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
                { id: 'rect', icon: Square, label: 'Box' },
                { id: 'circle', icon: Circle, label: 'Circle' },
                { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
                { id: 'blur', icon: Eraser, label: 'Redact' },
              ].map(t => (
                <button 
                  key={t.id} 
                  className={`pro-tool-btn ${tool === t.id ? 'active' : ''}`}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                >
                  <t.icon size={20} />
                </button>
              ))}
            </div>
            <div className="pro-tool-sep" />
            <div className="pro-color-grid" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Color</label>
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)} 
                style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} 
              />
            </div>
            <div className="pro-tool-sep" />
            <button className="pro-tool-btn" onClick={() => setAnnotations(prev => prev.slice(0, -1))} disabled={annotations.length === 0} title="Undo">
              <Undo2 size={20} />
            </button>
          </div>

          <div className="pro-canvas-container">
            <div className="pro-canvas-wrapper">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ cursor: 'crosshair', display: 'block' }}
              />
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
