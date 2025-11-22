import React from 'react';
import '../styles/AqiGauge.css'; // Import the new CSS file

export default function AqiGauge({ title, value, category, color, dominantPollutant }) {
  // Gauge geometry
  const aqiMin = 0, aqiMax = 500;
  const radius = 70, strokeWidth = 14, cx = 90, cy = 90;
  const clampedValue = Math.min(Math.max(value, aqiMin), aqiMax);
  const valuePercentage = (clampedValue - aqiMin) / (aqiMax - aqiMin);
  const angle = valuePercentage * 180;

  // Color stops for the gradient in the legend bar
  const aqiColorStops = [
    { offset: 0,    color: '#40C057' }, // Good
    { offset: 0.2,  color: '#FFD43B' }, // Moderate
    { offset: 0.4,  color: '#F08C00' }, // Unhealthy for Sensitive
    { offset: 0.6,  color: '#E03131' }, // Unhealthy
    { offset: 0.8,  color: '#8B1A99' }, // Very Unhealthy
    { offset: 1,    color: '#7E0023' }  // Hazardous
  ];

  // Format pollutant to handle subscripts
  const formatPollutant = (pollutant) => {
    if (!pollutant) return null;
    const pollutantLower = pollutant.toLowerCase();
    switch (pollutantLower) {
      case 'o3': return <>O<sub>3</sub></>;
      case 'pm25': return <>PM<sub>2.5</sub></>;
      case 'pm10': return <>PM<sub>10</sub></>;
      case 'no2': return <>NO<sub>2</sub></>;
      case 'so2': return <>SO<sub>2</sub></>;
      case 'co': return 'CO';
      default: return pollutant.toUpperCase();
    }
  };

  // SVG arc path
  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  const legendData = [
    { name: 'Good', range: '0-50', color: '#40C057' },
    { name: 'Satisfactory', range: '51-100', color: '#85D66A' },
    { name: 'Moderate', range: '101-200', color: '#FFD43B' },
    { name: 'Poor', range: '201-300', color: '#F08C00' },
    { name: 'Very Poor', range: '301-400', color: '#E03131' },
    { name: 'Severe', range: '401-500+', color: '#8B1A99' },
  ];

  return (
    <div className="aqi-gauge-container">
      <h2 className="gauge-title">{title}</h2>
      <div className="gauge-visual">
        <svg width="180" height="105" viewBox="0 0 180 105" className="gauge-svg">
          <defs>
            <linearGradient id="aqiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {aqiColorStops.map((stop, index) => (
                <stop key={index} offset={`${stop.offset * 100}%`} stopColor={stop.color} />
              ))}
            </linearGradient>
          </defs>
          {/* Background arc */}
          <path d={arcPath} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          {/* Foreground gradient arc */}
          <path d={arcPath} stroke="url(#aqiGradient)" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
          {/* Indicator needle */}
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform 0.5s ease-in-out' }}>
            <circle
              cx={cx - radius}
              cy={cy}
              r={strokeWidth * 0.65}
              fill={color} // Use the color prop from Home.jsx
              stroke="#fff"
              strokeWidth="3"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
            />
          </g>
        </svg>
        <div className="gauge-value-wrapper">
          <span className="gauge-value">{clampedValue}</span>
        </div>
      </div>
      <p className="gauge-category" style={{ color: color }}>{category}</p>
      {dominantPollutant && (
        <div className="dominant-pollutant">
          Dominant: <strong>{formatPollutant(dominantPollutant)}</strong>
        </div>
      )}
      <div className="legend-container">
        <div className="legend-grid">
          {legendData.map((item) => (
            <div key={item.name} className="legend-item">
              <div className="legend-color-box" style={{ backgroundColor: item.color }}></div>
              <div className="legend-text">
                <span className="legend-name">{item.name}</span>
                <span className="legend-range">{item.range}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}