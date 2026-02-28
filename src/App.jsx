import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Group } from 'react-konva'; 
import { 
  ImagePlus, Layers, Undo2, Redo2, GripVertical, Eye, EyeOff, X, MoveHorizontal, MoveVertical, Monitor, Palette, Crop,
  MousePointer2, SquareDashed, Link, Unlink
} from 'lucide-react';
import SetupScreen from './components/SetupScreen';
import URLImage from './components/URLImage';
import './index.css';

function App() {
  const [canvasConfig, setCanvasConfig] = useState(null);
  const [filenamePrefix, setFilenamePrefix] = useState('');
  
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, setBgColor] = useState('#000000');

  const [history, setHistory] = useState([[]]); 
  const [historyStep, setHistoryStep] = useState(0); 
  
  const images = history[historyStep] || []; 

  const [selectedId, selectShape] = useState(null);
  const [scale, setScale] = useState(0.5); 
  const [keepRatio, setKeepRatio] = useState(true); 

  const [activeTool, setActiveTool] = useState('cursor'); 
  const [isDrawingSelection, setIsDrawingSelection] = useState(false);
  const [selectionRect, setSelectionRect] = useState(null); 

  const [draggedLayer, setDraggedLayer] = useState(null);
  const [dragOverLayer, setDragOverLayer] = useState(null);
  
  const stageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasConfig) {
        const containerWidth = containerRef.current.offsetWidth * 0.9;
        const containerHeight = containerRef.current.offsetHeight * 0.9;
        const scaleX = containerWidth / canvasConfig.width;
        const scaleY = containerHeight / canvasConfig.height;
        setScale(Math.min(scaleX, scaleY));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasConfig]); 

  if (!canvasConfig) {
      return <SetupScreen onComplete={setCanvasConfig} />;
  }

  const handleCloseProject = () => {
      if (images.length > 0) {
          const confirmClose = window.confirm("Are you sure you want to close this project? All unsaved progress will be lost.");
          if (!confirmClose) return;
      }
      setCanvasConfig(null);
      setHistory([[]]);
      setHistoryStep(0);
      selectShape(null);
      setFilenamePrefix(''); 
      setBgEnabled(false);
      setBgColor('#000000'); 
      setActiveTool('cursor');
      setSelectionRect(null);
  };

  const commitHistory = (newImages) => {
    const nextHistory = history.slice(0, historyStep + 1);
    nextHistory.push(newImages);
    setHistory(nextHistory);
    setHistoryStep(nextHistory.length - 1);
  };

  const handleUndo = () => { if (historyStep > 0) setHistoryStep(historyStep - 1); };
  const handleRedo = () => { if (historyStep < history.length - 1) setHistoryStep(historyStep + 1); };

  const handleStageMouseDown = (e) => {
    if (activeTool === 'cursor') {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'canvas-background';
        if (clickedOnEmpty) selectShape(null);
    } else if (activeTool === 'marquee') {
        setIsDrawingSelection(true);
        const pos = e.target.getStage().getPointerPosition();
        setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
    }
  };

  const handleStageMouseMove = (e) => {
    if (!isDrawingSelection || activeTool !== 'marquee') return;
    const pos = e.target.getStage().getPointerPosition();
    setSelectionRect((prev) => ({
        ...prev,
        width: pos.x - prev.x,
        height: pos.y - prev.y
    }));
  };

  const handleStageMouseUp = () => {
    if (isDrawingSelection) {
        setIsDrawingSelection(false);
        if (selectionRect && Math.abs(selectionRect.width) < 5 && Math.abs(selectionRect.height) < 5) {
            setSelectionRect(null);
        }
    }
  };

  const handleApplyMask = () => {
    if (!selectedId || !selectionRect) return;
    
    const normX = selectionRect.width < 0 ? selectionRect.x + selectionRect.width : selectionRect.x;
    const normY = selectionRect.height < 0 ? selectionRect.y + selectionRect.height : selectionRect.y;
    const normW = Math.abs(selectionRect.width);
    const normH = Math.abs(selectionRect.height);

    const imgToUpdate = images.find(img => img.id === selectedId);
    if (imgToUpdate) {
        updateImage(selectedId, {
            ...imgToUpdate,
            mask: { x: normX, y: normY, width: normW, height: normH, enabled: true, linked: true }
        });
    }
    
    setSelectionRect(null);
    setActiveTool('cursor');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.src = reader.result;
      img.onload = () => {
        const newWidth = img.width > 800 ? 800 : img.width;
        const newHeight = img.height * (newWidth / img.width);
        
        const newImage = {
          id: `img-${Date.now()}`,
          name: `Layer ${images.length + 1}`,
          src: reader.result,
          x: canvasConfig.width / 2 - newWidth / 2, 
          y: canvasConfig.height / 2 - newHeight / 2, 
          width: newWidth,
          height: newHeight,
          naturalWidth: img.width,   
          naturalHeight: img.height, 
          rotation: 0,
          blur: 0,
          shadow: false,
          visible: true,
          opacity: 100,
          blendMode: 'source-over',
          cornerRadius: 0
        };
        commitHistory([...images, newImage]);
        selectShape(newImage.id); 
        setActiveTool('cursor'); 
      };
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  };

  const updateImage = (id, newAttributes) => {
    commitHistory(images.map((img) => (img.id === id ? newAttributes : img)));
  };

  const toggleVisibility = (e, id) => {
    e.stopPropagation(); 
    const imgToUpdate = images.find(img => img.id === id);
    if (imgToUpdate) {
        const newVisibleState = imgToUpdate.visible === false ? true : false;
        updateImage(id, { ...imgToUpdate, visible: newVisibleState });
        if (!newVisibleState && selectedId === id) selectShape(null);
    }
  };

  const deleteLayerById = (e, id) => {
    e.stopPropagation(); 
    commitHistory(images.filter((img) => img.id !== id));
    if (selectedId === id) selectShape(null);
  };

  const handleDragStart = (e, id) => {
    setDraggedLayer(id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.classList.add('is-dragging'); }, 0);
  };

  const handleDragOver = (e, id) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragOverLayer) setDragOverLayer(id);
  };

  const handleDragLeave = () => { setDragOverLayer(null); };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverLayer(null);
    setDraggedLayer(null);
    document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('is-dragging'));

    if (draggedLayer === targetId || !draggedLayer) return;

    const visualList = [...images].reverse();
    const draggedIdx = visualList.findIndex(img => img.id === draggedLayer);
    const targetIdx = visualList.findIndex(img => img.id === targetId);

    const [movedItem] = visualList.splice(draggedIdx, 1);
    visualList.splice(targetIdx, 0, movedItem);

    commitHistory(visualList.reverse());
  };

  const exportCanvas = (format) => {
    selectShape(null); 
    setSelectionRect(null); 
    
    setTimeout(() => {
        const stage = stageRef.current;
        let uri;
        
        const safePrefix = filenamePrefix.trim() || 'Untitled';
        let templateSuffix = canvasConfig.name.toLowerCase();
        
        if (templateSuffix === 'gn tile wall') {
            templateSuffix = 'tilewall';
        }
        
        const finalFilename = `${safePrefix} - ${templateSuffix}.${format}`;

        if (format === 'png') {
            uri = stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' });
        } else {
            const canvas = stage.toCanvas({ pixelRatio: 1 });
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const ctx = tempCanvas.getContext('2d');
            
            ctx.fillStyle = bgEnabled ? bgColor : '#ffffff';
            ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(canvas, 0, 0);
            
            uri = tempCanvas.toDataURL('image/jpeg', 0.95);
        }

        const link = document.createElement('a');
        link.download = finalFilename;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, 50);
  };

  const selectedImage = images.find(img => img.id === selectedId);

  const handleScaleChange = (e) => {
      const newScalePct = Number(e.target.value);
      if (!selectedImage) return;

      const natW = selectedImage.naturalWidth || selectedImage.width;
      const natH = selectedImage.naturalHeight || selectedImage.height;

      const newWidth = natW * (newScalePct / 100);
      const newHeight = natH * (newScalePct / 100);

      const deltaX = newWidth - selectedImage.width;
      const deltaY = newHeight - selectedImage.height;
      const ratio = newWidth / selectedImage.width;

      const finalX = selectedImage.x - (deltaX / 2);
      const finalY = selectedImage.y - (deltaY / 2);

      let newMask = selectedImage.mask;
      if (newMask && newMask.linked) {
          const offsetX = newMask.x - selectedImage.x;
          const offsetY = newMask.y - selectedImage.y;
          newMask = {
              ...newMask,
              x: finalX + (offsetX * ratio),
              y: finalY + (offsetY * ratio),
              width: newMask.width * ratio,
              height: newMask.height * ratio
          }
      }

      updateImage(selectedId, {
          ...selectedImage,
          width: newWidth,
          height: newHeight,
          x: finalX,
          y: finalY,
          mask: newMask
      });
  };

  const handleFitToCanvas = (dimension) => {
      if (!selectedImage) return;
      
      const natW = selectedImage.naturalWidth || selectedImage.width;
      const natH = selectedImage.naturalHeight || selectedImage.height;

      const scaleToFit = dimension === 'width' 
          ? canvasConfig.width / natW 
          : canvasConfig.height / natH;

      const newWidth = natW * scaleToFit;
      const newHeight = natH * scaleToFit;

      const ratio = newWidth / selectedImage.width;
      const finalX = (canvasConfig.width - newWidth) / 2;
      const finalY = (canvasConfig.height - newHeight) / 2;

      let newMask = selectedImage.mask;
      if (newMask && newMask.linked) {
          const offsetX = newMask.x - selectedImage.x;
          const offsetY = newMask.y - selectedImage.y;
          newMask = {
              ...newMask,
              x: finalX + (offsetX * ratio),
              y: finalY + (offsetY * ratio),
              width: newMask.width * ratio,
              height: newMask.height * ratio
          }
      }

      updateImage(selectedId, {
          ...selectedImage,
          width: newWidth,
          height: newHeight,
          x: finalX,
          y: finalY,
          mask: newMask
      });
  };

  const currentScalePct = selectedImage 
    ? Math.round((selectedImage.width / (selectedImage.naturalWidth || selectedImage.width)) * 100) 
    : 100;

  return (
    <div className="app-layout">
      
      <aside className="sidebar">
        <div className="brand" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px'}}>
            <div>
                Pro Editor
                <div style={{fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'normal', marginTop: '4px'}}>
                    <Monitor size={12} style={{verticalAlign: 'middle', marginRight: '4px'}}/>
                    {canvasConfig.name} ({canvasConfig.width}x{canvasConfig.height})
                </div>
            </div>
            <button 
                onClick={handleCloseProject} 
                className="layer-action-btn" 
                title="Close Project" 
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', 
                    background: 'rgba(239, 68, 68, 0.1)', padding: '6px 12px', borderRadius: '6px',
                    fontSize: '0.8rem', fontWeight: '600'
                }}
            >
                <X size={16} /> Close
            </button>
        </div>

        <div style={{marginBottom: '20px', display: 'flex', gap: '8px', background: '#111827', padding: '6px', borderRadius: '8px', border: '1px solid #374151'}}>
            <button 
                onClick={() => setActiveTool('cursor')}
                style={{
                    flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: activeTool === 'cursor' ? '#3b82f6' : 'transparent',
                    color: activeTool === 'cursor' ? '#fff' : '#9ca3af',
                }}
                title="Cursor (Move & Scale)"
            >
                <MousePointer2 size={18} />
            </button>
            <button 
                onClick={() => setActiveTool('marquee')}
                style={{
                    flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    background: activeTool === 'marquee' ? '#3b82f6' : 'transparent',
                    color: activeTool === 'marquee' ? '#fff' : '#9ca3af',
                }}
                title="Marquee Selection Tool"
            >
                <SquareDashed size={18} />
            </button>
        </div>
        
        <div className="tool-group">
            <label className="tool-btn">
                <ImagePlus size={20} />
                <span>Add Image</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
            </label>
        </div>

        <div className="history-group">
            <button className="tool-btn icon-btn" onClick={handleUndo} disabled={historyStep === 0} title="Undo">
                <Undo2 size={18} /> Undo
            </button>
            <button className="tool-btn icon-btn" onClick={handleRedo} disabled={historyStep === history.length - 1} title="Redo">
                <Redo2 size={18} /> Redo
            </button>
        </div>

        <div className="layers-panel">
            <div className="panel-header">
                <Layers size={16} /> Layers ({images.length})
            </div>
            <div className="layer-list">
                {images.length === 0 && <p className="empty-text">No layers yet.</p>}
                
                {[...images].reverse().map((img) => {
                    const isVisible = img.visible !== false;
                    return (
                    <div 
                        key={img.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, img.id)}
                        onDragOver={(e) => handleDragOver(e, img.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, img.id)}
                        onDragEnd={() => {
                           setDraggedLayer(null);
                           setDragOverLayer(null);
                           document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('is-dragging'));
                        }}
                        className={`layer-item ${selectedId === img.id ? 'active' : ''} ${dragOverLayer === img.id ? 'drag-over' : ''}`}
                        onClick={() => {
                            selectShape(img.id);
                            setActiveTool('cursor'); 
                        }}
                    >
                        <div className="layer-item-left">
                            <GripVertical size={14} className="drag-handle" />
                            <span className={!isVisible ? 'dimmed-text' : ''}>{img.name}</span>
                        </div>
                        <div className="layer-item-actions">
                            
                            {img.mask && (
                                <>
                                    <button 
                                        className="layer-action-btn" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateImage(img.id, { ...img, mask: { ...img.mask, linked: !img.mask.linked } });
                                        }} 
                                        title={img.mask.linked ? "Unlink Mask" : "Link Mask"}
                                        style={{color: img.mask.linked ? '#3b82f6' : '#9ca3af', marginRight: '2px'}}
                                    >
                                        {img.mask.linked ? <Link size={14} /> : <Unlink size={14} />}
                                    </button>
                                    <button 
                                        className="layer-action-btn" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateImage(img.id, { ...img, mask: { ...img.mask, enabled: !img.mask.enabled } });
                                        }} 
                                        title={img.mask.enabled ? "Disable Mask" : "Enable Mask"}
                                        style={{color: img.mask.enabled ? '#3b82f6' : '#9ca3af'}}
                                    >
                                        <SquareDashed size={14} />
                                    </button>
                                </>
                            )}

                            <button className="layer-action-btn" onClick={(e) => toggleVisibility(e, img.id)} title={isVisible ? "Hide Layer" : "Show Layer"}>
                                {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button className="layer-action-btn delete" onClick={(e) => deleteLayerById(e, img.id)} title="Delete Layer">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )})}
            </div>
        </div>

        <div className="export-panel">
            <div className="panel-header" style={{marginBottom: '10px'}}><Palette size={16} style={{display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px'}}/> Canvas & Export</div>
            
            <div style={{marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px'}}>
                <label style={{display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '8px'}}>Background</label>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <input 
                        type="color" 
                        value={bgColor} 
                        onChange={(e) => setBgColor(e.target.value)}
                        disabled={!bgEnabled}
                        style={{cursor: !bgEnabled ? 'not-allowed' : 'pointer'}}
                    />
                    <label style={{fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <input 
                            type="checkbox" 
                            checked={bgEnabled} 
                            onChange={(e) => setBgEnabled(e.target.checked)} 
                        />
                        Solid Color
                    </label>
                </div>
            </div>

            <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '6px'}}>Filename</label>
                <div style={{background: '#111827', border: '1px solid #4b5563', borderRadius: '6px'}}>
                    <input
                        type="text"
                        value={filenamePrefix}
                        onChange={(e) => setFilenamePrefix(e.target.value)}
                        placeholder="Filename"
                        style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', color: 'white', padding: '10px', outline: 'none', fontSize: '0.85rem'}}
                    />
                </div>
            </div>

            <div className="export-buttons">
                <button className="tool-btn primary" onClick={() => exportCanvas('png')}>PNG</button>
                <button className="tool-btn secondary" onClick={() => exportCanvas('jpeg')}>JPEG</button>
            </div>
        </div>
      </aside>

      <main className="workspace" ref={containerRef}>
        <div 
            className={`canvas-container ${activeTool === 'marquee' ? 'crosshair-cursor' : ''}`} 
            style={{ width: canvasConfig.width, height: canvasConfig.height, transform: `scale(${scale})` }}
        >
            <Stage 
                width={canvasConfig.width} 
                height={canvasConfig.height} 
                onMouseDown={handleStageMouseDown} 
                onMouseMove={handleStageMouseMove}
                onMouseUp={handleStageMouseUp}
                onTouchStart={handleStageMouseDown} 
                onTouchMove={handleStageMouseMove}
                onTouchEnd={handleStageMouseUp}
                ref={stageRef}
            >
                <Layer>
                    {bgEnabled && (
                        <Rect 
                            name="canvas-background"
                            x={0} y={0} 
                            width={canvasConfig.width} height={canvasConfig.height} 
                            fill={bgColor} 
                            listening={true} 
                        />
                    )}

                    {images.map((img) => {
                        const hasMask = img.mask && img.mask.enabled;
                        
                        const imageNode = (
                            <URLImage
                                key={img.id}
                                // FIXED: If masked, disable the inner image's shadow so the Group can handle it
                                shapeProps={hasMask ? { ...img, shadow: false } : img}
                                isDraggable={activeTool === 'cursor'}
                                isSelected={img.id === selectedId && activeTool === 'cursor'}
                                onSelect={() => {
                                    if (activeTool === 'cursor') selectShape(img.id);
                                }}
                                onChange={(newAttrs) => updateImage(img.id, newAttrs)}
                                keepRatio={keepRatio}
                                canvasWidth={canvasConfig.width}
                                canvasHeight={canvasConfig.height}
                            />
                        );

                        if (hasMask) {
                            return (
                                <React.Fragment key={`mask-fragment-${img.id}`}>
                                    {/* FIXED: Group now renders the shadow perfectly based on the clipped edges */}
                                    <Group  
                                        clipX={img.mask.x} 
                                        clipY={img.mask.y} 
                                        clipWidth={img.mask.width} 
                                        clipHeight={img.mask.height}
                                        shadowColor="rgba(0,0,0,0.6)"
                                        shadowBlur={img.shadow ? 30 : 0}
                                        shadowOffsetY={img.shadow ? 15 : 0}
                                        shadowOpacity={img.shadow ? 1 : 0}
                                    >
                                        {imageNode}
                                    </Group>

                                    {/* NEW: Green Mask Visualizer when selected */}
                                    {img.id === selectedId && activeTool === 'cursor' && (
                                        <Rect
                                            x={img.mask.x}
                                            y={img.mask.y}
                                            width={img.mask.width}
                                            height={img.mask.height}
                                            stroke="#10b981" 
                                            strokeWidth={1 / scale} 
                                            dash={[5 / scale, 5 / scale]}
                                            listening={false} 
                                        />
                                    )}
                                </React.Fragment>
                            );
                        }
                        
                        return imageNode;
                    })}

                    {selectionRect && (
                        <Rect
                            x={selectionRect.width < 0 ? selectionRect.x + selectionRect.width : selectionRect.x}
                            y={selectionRect.height < 0 ? selectionRect.y + selectionRect.height : selectionRect.y}
                            width={Math.abs(selectionRect.width)}
                            height={Math.abs(selectionRect.height)}
                            fill="rgba(59, 130, 246, 0.2)"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dash={[6, 6]}
                            listening={false} 
                        />
                    )}
                </Layer>
            </Stage>
        </div>
      </main>

      <aside className="properties-panel">
        <div className="panel-header">Properties</div>
        
        {activeTool === 'marquee' && selectionRect && selectedImage && (
            <div style={{marginBottom: '15px', background: 'rgba(59, 130, 246, 0.1)', padding: '15px', borderRadius: '6px', border: '1px solid #3b82f6'}}>
                <p style={{fontSize: '0.8rem', color: '#fff', marginTop: 0, marginBottom: '10px', textAlign: 'center'}}>Active Selection</p>
                <button 
                    className="tool-btn primary" 
                    style={{width: '100%', justifyContent: 'center'}}
                    onClick={handleApplyMask}
                >
                    Apply Mask to Layer
                </button>
            </div>
        )}

        {!selectedImage ? (
            <p className="empty-text">Select an image on the canvas to edit its properties.</p>
        ) : (
            <div className="prop-controls">

                {/* NEW: Mask Properties Panel */}
                {selectedImage.mask && selectedImage.mask.enabled && (
                    <>
                        <div style={{fontSize: '0.85rem', color: '#fff', marginBottom: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <SquareDashed size={14} color="#10b981" /> Mask Position
                            </div>
                            <button 
                                className="tool-btn secondary"
                                onClick={() => updateImage(selectedId, { ...selectedImage, mask: { ...selectedImage.mask, linked: !selectedImage.mask.linked } })}
                                style={{ padding: '4px 8px', fontSize: '0.75rem', gap: '4px', background: selectedImage.mask.linked ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: selectedImage.mask.linked ? '#3b82f6' : '#9ca3af', border: selectedImage.mask.linked ? '1px solid #3b82f6' : '1px solid #4b5563' }}
                            >
                                {selectedImage.mask.linked ? <Link size={12} /> : <Unlink size={12} />}
                                {selectedImage.mask.linked ? 'Linked' : 'Unlinked'}
                            </button>
                        </div>
                        
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '5px'}}>
                            <div>
                                <label style={{fontSize: '0.7rem', color: '#9ca3af'}}>X Position</label>
                                <input type="number" value={Math.round(selectedImage.mask.x)} onChange={(e) => updateImage(selectedId, { ...selectedImage, mask: { ...selectedImage.mask, x: Number(e.target.value) } })} style={{width: '100%', boxSizing: 'border-box', background: '#111827', border: '1px solid #4b5563', color: 'white', padding: '6px', borderRadius: '4px', outline: 'none'}} />
                            </div>
                            <div>
                                <label style={{fontSize: '0.7rem', color: '#9ca3af'}}>Y Position</label>
                                <input type="number" value={Math.round(selectedImage.mask.y)} onChange={(e) => updateImage(selectedId, { ...selectedImage, mask: { ...selectedImage.mask, y: Number(e.target.value) } })} style={{width: '100%', boxSizing: 'border-box', background: '#111827', border: '1px solid #4b5563', color: 'white', padding: '6px', borderRadius: '4px', outline: 'none'}} />
                            </div>
                            <div>
                                <label style={{fontSize: '0.7rem', color: '#9ca3af'}}>Width</label>
                                <input type="number" value={Math.round(selectedImage.mask.width)} onChange={(e) => updateImage(selectedId, { ...selectedImage, mask: { ...selectedImage.mask, width: Number(e.target.value) } })} style={{width: '100%', boxSizing: 'border-box', background: '#111827', border: '1px solid #4b5563', color: 'white', padding: '6px', borderRadius: '4px', outline: 'none'}} />
                            </div>
                            <div>
                                <label style={{fontSize: '0.7rem', color: '#9ca3af'}}>Height</label>
                                <input type="number" value={Math.round(selectedImage.mask.height)} onChange={(e) => updateImage(selectedId, { ...selectedImage, mask: { ...selectedImage.mask, height: Number(e.target.value) } })} style={{width: '100%', boxSizing: 'border-box', background: '#111827', border: '1px solid #4b5563', color: 'white', padding: '6px', borderRadius: '4px', outline: 'none'}} />
                            </div>
                        </div>
                        <hr style={{borderColor: '#374151', margin: '15px 0'}} />
                    </>
                )}
                
                <div className="control-group">
                    <label>Fit to Canvas</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="tool-btn secondary" onClick={() => handleFitToCanvas('width')} style={{flex: 1, padding: '8px', fontSize: '0.85rem'}}>
                            <MoveHorizontal size={14} /> Width
                        </button>
                        <button className="tool-btn secondary" onClick={() => handleFitToCanvas('height')} style={{flex: 1, padding: '8px', fontSize: '0.85rem'}}>
                            <MoveVertical size={14} /> Height
                        </button>
                    </div>
                </div>

                <div className="control-group">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <label>Scale</label>
                        <span style={{fontSize: '0.8rem', color: '#9ca3af'}}>{currentScalePct}%</span>
                    </div>
                    <input type="range" min="1" max="500" value={currentScalePct} onChange={handleScaleChange} />
                </div>

                <hr style={{borderColor: '#374151', margin: '15px 0'}} />
                
                <div className="control-group">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Crop size={14} /> Corner Radius</label>
                        <span style={{fontSize: '0.8rem', color: '#9ca3af'}}>{selectedImage.cornerRadius || 0}px</span>
                    </div>
                    <input type="range" min="0" max="1000" value={selectedImage.cornerRadius || 0} onChange={(e) => updateImage(selectedId, { ...selectedImage, cornerRadius: Number(e.target.value) })} />
                </div>

                <hr style={{borderColor: '#374151', margin: '15px 0'}} />

                <div className="control-group">
                    <label style={{marginBottom: '6px', display: 'block'}}>Blend Mode</label>
                    <select 
                        value={selectedImage.blendMode || 'source-over'} 
                        onChange={(e) => updateImage(selectedId, { ...selectedImage, blendMode: e.target.value })}
                        style={{
                            width: '100%', padding: '8px', background: '#111827', color: 'white', 
                            border: '1px solid #4b5563', borderRadius: '4px', outline: 'none'
                        }}
                    >
                        <option value="source-over">Normal</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                        <option value="overlay">Overlay</option>
                        <option value="darken">Darken</option>
                        <option value="lighten">Lighten</option>
                        <option value="color-dodge">Color Dodge</option>
                        <option value="color-burn">Color Burn</option>
                        <option value="hard-light">Hard Light</option>
                        <option value="difference">Difference</option>
                    </select>
                </div>

                <div className="control-group">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <label>Opacity</label>
                        <span style={{fontSize: '0.8rem', color: '#9ca3af'}}>{selectedImage.opacity ?? 100}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={selectedImage.opacity ?? 100} onChange={(e) => updateImage(selectedId, { ...selectedImage, opacity: Number(e.target.value) })} />
                </div>

                <hr style={{borderColor: '#374151', margin: '15px 0'}} />

                <div className="control-group">
                    <label>
                        <input type="checkbox" checked={keepRatio} onChange={(e) => setKeepRatio(e.target.checked)} />
                        Maintain Aspect Ratio
                    </label>
                </div>

                <div className="control-group">
                    <label>
                        <input type="checkbox" checked={selectedImage.shadow} onChange={(e) => updateImage(selectedId, { ...selectedImage, shadow: e.target.checked })} />
                        Drop Shadow
                    </label>
                </div>

                <div className="control-group">
                    <label>Blur: {selectedImage.blur}px</label>
                    <input type="range" min="0" max="180" value={selectedImage.blur} onChange={(e) => updateImage(selectedId, { ...selectedImage, blur: Number(e.target.value) })} />
                </div>
            </div>
        )}
      </aside>
    </div>
  );
}

export default App;