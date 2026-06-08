import React from 'react';
import CloseIcon from '@mui/icons-material/Close';

/** Details popup for a single pollutant (concentration, sources, health effects). */
const PollutantModal = ({ pollutant, onClose }) => {
  if (!pollutant) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{pollutant.displayName} ({pollutant.fullName})</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-concentration">
            <span className="modal-label">Concentration:</span>
            <span className="modal-value">
              {pollutant.concentration.value} {pollutant.concentration.units.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="modal-section">
            <h4 className="modal-subtitle">Sources</h4>
            <p>{pollutant.additionalInfo?.sources || 'Information not available'}</p>
          </div>

          <div className="modal-section">
            <h4 className="modal-subtitle">Health Effects</h4>
            <p>{pollutant.additionalInfo?.effects || 'Information not available'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PollutantModal;
