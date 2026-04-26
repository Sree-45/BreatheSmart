import React from 'react';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import '../styles/HealthRecommendations.css';

const toItems = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

export default function HealthRecommendations({ recommendation, fallback }) {
  const primary = toItems(recommendation?.primary);
  const secondary = toItems(recommendation?.secondary);

  if (primary.length === 0 && secondary.length === 0) {
    return (
      <div className="health-recommendations-container">
        <p className="health-recommendations-empty">
          No personalized recommendations available right now.
        </p>
      </div>
    );
  }

  return (
    <div className="health-recommendations-container">
      {fallback && (
        <div className="health-recs-fallback-banner" role="status">
          General guidance only — no specific guidelines were highly relevant for this query.
        </div>
      )}

      {primary.length > 0 && (
        <section className="health-recs-section primary">
          <header className="health-recs-section-header">
            <PriorityHighIcon fontSize="small" />
            <h4>Take action now</h4>
          </header>
          <ul className="health-recs-list">
            {primary.map((item, idx) => (
              <li key={`p-${idx}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {secondary.length > 0 && (
        <section className="health-recs-section secondary">
          <header className="health-recs-section-header">
            <LightbulbOutlinedIcon fontSize="small" />
            <h4>Also worth doing</h4>
          </header>
          <ul className="health-recs-list">
            {secondary.map((item, idx) => (
              <li key={`s-${idx}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
