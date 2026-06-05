/**
 * Air-quality data service.
 *
 * Prefers the Spring backend proxy (`/api/air-quality/*`, keeps the key server-side),
 * but transparently falls back to calling Google's Air Quality API directly from the
 * browser when the backend is unreachable — so the app still works frontend-only.
 */

const BACKEND_URL = '/api/air-quality';
const GOOGLE_AQ = 'https://airquality.googleapis.com/v1';

// Google Maps browser key. Replace the placeholder with your key (or set
// VITE_GOOGLE_MAPS_API_KEY). Restrict the key by HTTP referrer in Google Cloud.
export const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY').trim();

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Try the backend first; on any failure call Google directly with the browser key. */
async function backendThenDirect(path, backendBody, directBody) {
  try {
    return await postJson(`${BACKEND_URL}${path}`, backendBody);
  } catch (e) {
    console.warn(`AQI ${path} via backend failed (${e.message}); calling Google directly.`);
    const endpoint = {
      '/current': 'currentConditions:lookup',
      '/history': 'history:lookup',
      '/forecast': 'forecast:lookup',
    }[path];
    return postJson(`${GOOGLE_AQ}/${endpoint}?key=${GOOGLE_MAPS_API_KEY}`, directBody);
  }
}

/** Current air quality for a location ({latitude, longitude}). */
export const fetchCurrentConditions = async (location) => {
  const loc = { latitude: location.latitude, longitude: location.longitude };
  return backendThenDirect(
    '/current',
    { location: loc },
    {
      location: loc,
      extraComputations: [
        'HEALTH_RECOMMENDATIONS',
        'POLLUTANT_CONCENTRATION',
        'POLLUTANT_ADDITIONAL_INFO',
        'DOMINANT_POLLUTANT_CONCENTRATION',
        'LOCAL_AQI',
      ],
      languageCode: 'en',
    },
  );
};

/** Historical air quality (up to `hours` back). */
export const fetchHistoricalData = async (location, hours = 24) => {
  const loc = { latitude: location.latitude, longitude: location.longitude };
  return backendThenDirect(
    '/history',
    { location: loc, hours },
    {
      location: loc,
      hours,
      extraComputations: [
        'HEALTH_RECOMMENDATIONS',
        'POLLUTANT_CONCENTRATION',
        'DOMINANT_POLLUTANT_CONCENTRATION',
        'LOCAL_AQI',
      ],
      languageCode: 'en',
    },
  );
};

/** 24-hour hourly forecast. Returns the payload with `hourlyForecasts`, or null. */
export const fetchForecastData = async (location) => {
  const loc = { latitude: location.latitude, longitude: location.longitude };

  // Next full hour → +24h window (matches the backend's request).
  const startTime = new Date();
  startTime.setMinutes(0, 0, 0);
  startTime.setHours(startTime.getHours() + 1);
  const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

  try {
    const json = await backendThenDirect(
      '/forecast',
      { location: loc },
      {
        location: loc,
        period: { startTime: startTime.toISOString(), endTime: endTime.toISOString() },
        pageSize: 24,
      },
    );
    if (json?.hourlyForecasts && Array.isArray(json.hourlyForecasts) && json.hourlyForecasts.length) {
      return json;
    }
    console.warn('Missing / empty hourlyForecasts', json);
    return null;
  } catch (e) {
    console.warn('Forecast error:', e.message);
    return null;
  }
};

/**
 * Select the preferred AQI index from an `indexes` array.
 * Prioritises India's National AQI (`ind_cpcb`), falls back to the universal AQI.
 */
export const getPreferredAqi = (indexes) => {
  if (!indexes || indexes.length === 0) return null;
  return (
    indexes.find((idx) => idx.code === 'ind_cpcb') ||
    indexes.find((idx) => idx.code === 'uaqi') ||
    null
  );
};
