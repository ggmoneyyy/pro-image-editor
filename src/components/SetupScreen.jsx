import React, { useState } from 'react';
import { Layout } from 'lucide-react';

const SetupScreen = ({ onComplete }) => {
    const PRESETS = [
        { name: '16x9', width: 1920, height: 1080 },
        { name: 'Panoramic', width: 6828, height: 1080 },
        { name: 'GN Tile Wall', width: 3840, height: 1080 },
        { name: 'Square', width: 1080, height: 1080 },
    ];

    const [selectedMode, setSelectedMode] = useState(PRESETS[0]);
    const [customW, setCustomW] = useState(1920);
    const [customH, setCustomH] = useState(1080);

    const handleStart = () => {
        if (selectedMode === 'free') {
            onComplete({ name: 'Custom', width: Number(customW), height: Number(customH) });
        } else {
            onComplete(selectedMode);
        }
    };

    return (
        <div className="setup-container">
            <div className="setup-card">
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px'}}>
                    <Layout size={28} color="#3b82f6" />
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>Create New Project</h1>
                </div>
                <p className="helper-text" style={{marginBottom: '30px', fontSize: '0.9rem'}}>Select a canvas template or enter custom dimensions.</p>

                <div className="preset-grid">
                    {PRESETS.map((preset) => (
                        <div 
                            key={preset.name}
                            className={`preset-btn ${selectedMode.name === preset.name ? 'selected' : ''}`}
                            onClick={() => setSelectedMode(preset)}
                        >
                            <div className="preset-title">{preset.name}</div>
                            <div className="preset-dim">{preset.width} × {preset.height} px</div>
                        </div>
                    ))}
                    <div 
                        className={`preset-btn ${selectedMode === 'free' ? 'selected' : ''}`}
                        onClick={() => setSelectedMode('free')}
                    >
                        <div className="preset-title">Free</div>
                        <div className="preset-dim">Custom dimensions</div>
                    </div>
                </div>

                {selectedMode === 'free' && (
                    <div className="custom-dim-form">
                        <div style={{flex: 1}}>
                            <label style={{fontSize: '0.8rem', color: '#9ca3af'}}>Width (px)</label>
                            <input type="number" className="custom-input" value={customW} onChange={e => setCustomW(e.target.value)} />
                        </div>
                        <div style={{flex: 1}}>
                            <label style={{fontSize: '0.8rem', color: '#9ca3af'}}>Height (px)</label>
                            <input type="number" className="custom-input" value={customH} onChange={e => setCustomH(e.target.value)} />
                        </div>
                    </div>
                )}

                <button 
                    className="start-btn" 
                    onClick={handleStart}
                    disabled={selectedMode === 'free' && (!customW || !customH || customW < 10 || customH < 10)}
                >
                    Create Canvas
                </button>
            </div>
        </div>
    );
};

export default SetupScreen;