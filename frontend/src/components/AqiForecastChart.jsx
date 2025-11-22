import React from 'react';
import { Line } from 'react-chartjs-2';
import TimelineIcon from '@mui/icons-material/Timeline';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import { getPreferredAqi } from '../services/airQualityService';

export default function AqiForecastChart({ data, onExpand }) {
  // Enhanced validation with detailed logging
  if (!data) {
    console.warn('AqiForecastChart: No data provided');
    return renderEmptyState('No data available');
  }

  if (!Array.isArray(data.hourlyForecasts)) {
    console.warn('AqiForecastChart: hourlyForecasts is not an array', data);
    return renderEmptyState('Forecast data format is invalid');
  }

  if (data.hourlyForecasts.length === 0) {
    console.warn('AqiForecastChart: hourlyForecasts is empty');
    return renderEmptyState('Forecast not available for this area');
  }

  // Limit to exactly 24 hours
  const limitedForecasts = data.hourlyForecasts.slice(0, 24);

  const formatDate = (dateTimeStr) => {
    try {
      const date = new Date(dateTimeStr);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateTimeStr);
        return 'Invalid';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Error';
    }
  };

  try {
    // Build chart data with validation
    const chartLabels = limitedForecasts.map(hour => formatDate(hour.dateTime));
    const chartValues = limitedForecasts.map(hour => {
      if (!hour.indexes || !Array.isArray(hour.indexes)) {
        console.warn('Missing indexes for forecast hour:', hour);
        return null;
      }
      const preferredAqi = getPreferredAqi(hour.indexes);
      return preferredAqi?.aqi ?? null;
    });

    // Verify we have valid data
    const validDataPoints = chartValues.filter(v => v !== null).length;
    if (validDataPoints === 0) {
      console.warn('AqiForecastChart: No valid AQI data points');
      return renderEmptyState('No valid AQI data in forecast');
    }

    const chartData = {
      labels: chartLabels,
      datasets: [{
        label: 'AQI',
        data: chartValues,
        fill: false,
        backgroundColor: '#2563eb',
        borderColor: '#2563eb',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 13 },
          bodyFont: { size: 12 },
          padding: 10,
          displayColors: false,
          callbacks: {
            afterLabel: function(context) {
              const index = context.dataIndex;
              const forecast = limitedForecasts[index];
              if (forecast?.indexes) {
                const aqi = getPreferredAqi(forecast.indexes);
                return aqi ? `Category: ${aqi.category}` : 'No category';
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          title: {
            display: true,
            text: 'Air Quality Index'
          }
        }
      }
    };

    return (
      <div className="time-section">
        <div className="time-header">
          <div className="time-title">
            <TimelineIcon className="time-icon" />
            24-Hour AQI Forecast
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
  } catch (error) {
    console.error("Error rendering forecast chart:", error);
    return renderEmptyState(`Error: ${error.message}`);
  }
}

function renderEmptyState(message) {
  return (
    <div className="time-section">
      <div className="time-header">
        <div className="time-title">
          <TimelineIcon className="time-icon" />
          24-Hour AQI Forecast
        </div>
      </div>
      <div className="chart-container">
        <p className="loading-placeholder">{message}</p>
      </div>
    </div>
  );
}