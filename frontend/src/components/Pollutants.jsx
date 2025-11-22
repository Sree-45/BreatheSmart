import React from 'react';
import InfoIcon from '@mui/icons-material/Info';
import '../styles/Pollutants.css';

export default function Pollutants({ pollutants, onSelect }) {
  return (
    <div className="pollutants-section">
      <div className="section-title">Pollutants</div>
      <div className="pollutant-cards-grid">
        {pollutants.map((p, idx) => (
          <div
            className="pollutant-card-compact"
            key={idx}
            onClick={() => onSelect(p)}
          >
            <div className="pollutant-card-header">
              <span className="pollutant-name">{p.displayName}</span>
              <InfoIcon className="info-icon" fontSize="small" />
            </div>
            <div className="pollutant-concentration">
              {p.concentration.value}
              <span className="pollutant-unit">
                {p.concentration.units.includes('MICROGRAMS') ? 'μg/m³' : 'ppb'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}