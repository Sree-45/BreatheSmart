import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import AqiHistoryChart from './AqiHistoryChart';
import AqiForecastChart from './AqiForecastChart';

/**
 * Stats modal — weather summary + AQI history/forecast charts. Opened from the
 * "Stats" action (dock on desktop, bottom nav on mobile). Uses the shared modal
 * chrome so it themes + sizes responsively like every other dialog.
 */
const StatsModal = ({ onClose, historyData, forecastData, weatherData, onExpand }) => {
    const t = weatherData?.temperature?.degrees;
    const cond = weatherData?.weatherCondition?.description?.text;
    const feels = weatherData?.feelsLikeTemperature?.degrees;
    const humidity = weatherData?.relativeHumidity;
    const wind = weatherData?.wind?.speed?.value;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content modal-large stats-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Statistics</h3>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        <CloseIcon />
                    </button>
                </div>
                <div className="modal-body">
                    {t != null && (
                        <div className="weather-card">
                            <div className="weather-card-main">
                                <span className="weather-card-temp">{Math.round(t)}°C</span>
                                <span className="weather-card-cond">{cond || 'Current weather'}</span>
                            </div>
                            <div className="weather-card-stats">
                                {feels != null && (<div><span>Feels like</span><strong>{Math.round(feels)}°</strong></div>)}
                                {typeof humidity === 'number' && (<div><span>Humidity</span><strong>{humidity}%</strong></div>)}
                                {wind != null && (<div><span>Wind</span><strong>{Math.round(wind)} km/h</strong></div>)}
                            </div>
                        </div>
                    )}

                    {historyData ? (
                        <AqiHistoryChart
                            data={historyData}
                            onExpand={() => onExpand?.({ type: 'history', data: historyData })}
                        />
                    ) : (
                        <div className="chart-container">
                            <p className="loading-placeholder">Historical data not available</p>
                        </div>
                    )}

                    {forecastData ? (
                        <AqiForecastChart
                            data={forecastData}
                            onExpand={() => onExpand?.({ type: 'forecast', data: forecastData })}
                        />
                    ) : (
                        <div className="chart-container">
                            <p className="loading-placeholder">Forecast data not available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatsModal;
