import React from 'react';
import { Line } from 'react-chartjs-2';
import HistoryIcon from '@mui/icons-material/History';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import '../styles/Charts.css';
import { getPreferredAqi } from '../services/airQualityService';

export default function AqiHistoryChart({ data, onExpand }) {
  const formatDate = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const chartData = {
    labels: data.hoursInfo.map(hour => formatDate(hour.dateTime)),
    datasets: [{
      label: 'AQI',
      data: data.hoursInfo.map(hour => getPreferredAqi(hour.indexes)?.aqi),
      fill: false,
      backgroundColor: '#2563eb',
      borderColor: '#2563eb',
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        title: { display: true, text: 'Air Quality Index' }
      }
    }
  };

  return (
    <div className="time-section">
      <div className="time-header">
        <div className="time-title">
          <HistoryIcon className="time-icon" />
          Historical AQI
        </div>
        <button className="chart-expand-btn" onClick={onExpand} aria-label="Expand chart">
          <ZoomOutMapIcon fontSize="small" />
        </button>
      </div>
      <div className="chart-container">
        <Line data={chartData} options={chartOptions} height={180} />
      </div>
    </div>
  );
}