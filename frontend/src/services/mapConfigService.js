const BACKEND_URL = "/api/map";

export const getMapConfig = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/config`);
    if (!response.ok) throw new Error('Failed to fetch map config');
    return await response.json();
  } catch (error) {
    console.error("Failed to get map config:", error);
    return null;
  }
};

export const getMapStyles = async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/styles`);
    if (!response.ok) throw new Error('Failed to fetch map styles');
    return await response.json();
  } catch (error) {
    console.error("Failed to get map styles:", error);
    return [];
  }
};

export const reverseGeocode = async (latitude, longitude) => {
  try {
    const response = await fetch(`${BACKEND_URL}/geocode/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude })
    });
    if (!response.ok) throw new Error('Failed to reverse geocode');
    const data = await response.json();
    return data.locationName;
  } catch (error) {
    console.error("Failed to reverse geocode:", error);
    return null;
  }
};