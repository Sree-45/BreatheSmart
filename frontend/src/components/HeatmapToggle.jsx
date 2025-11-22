import React from 'react';
import LayersIcon from '@mui/icons-material/Layers';
import Switch from '@mui/material/Switch';
import '../styles/HeatmapToggle.css';

export default function HeatmapToggle({ checked, onChange }) {
  return (
    <div className="heatmap-toggle">
      <div className="toggle-label">
        <LayersIcon className="toggle-icon" />
        Show heatmap
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        color="primary"
      />
    </div>
  );
}