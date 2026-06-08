import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getPreferredAqi } from '../services/airQualityService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const formatDateTime = (dateTimeStr) => {
  const date = new Date(dateTimeStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/** Expanded line chart of historical or forecast AQI. */
const ChartModal = ({ chartType, data, onClose }) => {
  const isHistory = chartType === 'history';
  const series = (d) => (isHistory ? d?.hoursInfo : d?.hourlyForecasts);

  // Read the live theme straight off <html> so axis/title text stays readable
  // in dark mode (Chart.js defaults to dark grey, which vanishes on a dark card).
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';

  const tickColor = isDark ? '#cbd5e1' : '#4b5563';
  const titleColor = isDark ? '#e5e7eb' : '#374151';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(0, 0, 0, 0.06)';
  const lineColor = isDark ? '#60a5fa' : isHistory ? '#2563eb' : '#1741a6';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: isHistory ? 'Historical AQI Data' : 'AQI Forecast Data',
        color: titleColor,
        font: { size: 15, weight: 'bold' },
        padding: { bottom: 16 },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 24, 40, 0.96)' : 'rgba(255, 255, 255, 0.96)',
        titleColor: isDark ? '#e5e7eb' : '#333',
        bodyColor: isDark ? '#cbd5e1' : '#555',
        borderColor: '#3b82f6',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            return `${isHistory ? 'Historical' : 'Forecast'} AQI - ${formatDateTime(series(data)[idx].dateTime)}`;
          },
          label: (item) => {
            const aqi = getPreferredAqi(series(data)[item.dataIndex].indexes);
            if (!aqi) return 'No data';
            return [`AQI: ${aqi.aqi} - ${aqi.category}`, `Dominant: ${aqi.dominantPollutant.toUpperCase()}`];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: tickColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        title: { display: true, text: 'Time', color: titleColor },
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: tickColor },
        title: { display: true, text: 'Air Quality Index', color: titleColor },
      },
    },
  };

  const title = isHistory ? 'Historical Air Quality' : 'Air Quality Forecast';

  const Shell = ({ children }) => (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body chart-modal-body">{children}</div>
      </div>
    </div>
  );

  if (!series(data)) {
    return <Shell><div className="loading-message">No data available</div></Shell>;
  }

  const chartData = {
    labels: series(data).map((hour) => formatDateTime(hour.dateTime)),
    datasets: [
      {
        label: isHistory ? 'Historical AQI' : 'Forecast AQI',
        data: series(data).map((hour) => getPreferredAqi(hour.indexes)?.aqi),
        fill: false,
        backgroundColor: lineColor,
        borderColor: lineColor,
        pointBackgroundColor: lineColor,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        borderDash: isHistory ? [] : [5, 5],
      },
    ],
  };

  return (
    <Shell>
      {/* Fixed, responsive height so maintainAspectRatio:false renders proportionately. */}
      <div style={{ position: 'relative', width: '100%', height: 'min(55vh, 420px)' }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </Shell>
  );
};

export default ChartModal;
