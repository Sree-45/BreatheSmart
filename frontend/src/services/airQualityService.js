/**
 * Service for fetching air quality data from Backend (which calls Google Maps Air Quality API)
 */

const BACKEND_URL = "/api/air-quality";

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Fetch current air quality conditions for a specific location
 * @param {Object} location - The location coordinates {latitude, longitude, accuracy}
 * @returns {Promise<Object>} - Current air quality data
 */
export const fetchCurrentConditions = async (location) => {
  try {
    // Log accuracy for debugging
    if (location.accuracy) {
      console.log(`📍 Using location with accuracy: ${location.accuracy.toFixed(0)}m`);
    }

    const response = await fetch(`${BACKEND_URL}/current`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch current conditions:", error);
    throw error;
  }
};

/**
 * Fetch historical air quality data for a specific location
 * @param {Object} location - The location coordinates {latitude, longitude}
 * @param {number} hours - Number of hours back to request (up to 720)
 * @returns {Promise<Object>} - Historical air quality data
 */
export const fetchHistoricalData = async (location, hours = 24) => {
  try {
    const response = await fetch(`${BACKEND_URL}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        hours: hours
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch historical data:", error);
    throw error;
  }
};

/**
 * Fetch forecast air quality data with progressive shrinking window.
 * Backend tries durations: 24h, 12h, 6h, 3h, 1h.
 * Returns first successful JSON with hourlyForecasts, else null.
 */
export const fetchForecastData = async (location) => {
  try {
    const response = await fetch(`${BACKEND_URL}/forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const json = await response.json();
    if (!json.hourlyForecasts || !Array.isArray(json.hourlyForecasts) || !json.hourlyForecasts.length) {
      console.warn("Missing / empty hourlyForecasts", json);
      return null;
    }
    return json;
  } catch (e) {
    console.warn("Forecast error:", e.message);
    return null;
  }
};

/**
 * Helper to select the preferred AQI index from an array of indexes.
 * It prioritizes a specific regional index (e.g., India's NAQI) and falls back to the universal AQI.
 * @param {Array} indexes - The array of AQI indexes from the API response.
 * @returns {Object|null} - The most appropriate AQI index object or null.
 */
export const getPreferredAqi = (indexes) => {
  if (!indexes || indexes.length === 0) {
    console.warn('getPreferredAqi: No indexes provided');
    return null;
  }

  // Find and return the Indian National AQI ('ind_cpcb').
  const nationalAqi = indexes.find(idx => idx.code === 'ind_cpcb');

  // If 'ind_cpcb' is found, return it. Otherwise, fall back to the universal AQI.
  const result = nationalAqi || indexes.find(idx => idx.code === 'uaqi') || null;
  
  if (!result) {
    console.warn('getPreferredAqi: No matching AQI found in indexes:', indexes.map(i => i.code));
  }
  
  return result;
};