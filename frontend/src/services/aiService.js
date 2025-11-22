import api from './api';

export const fetchAiRecommendations = async (airQualityData) => {
  try {
    // The api instance should automatically include the Bearer token
    // Verify the token exists:
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.warn('⚠️ No auth token found. User may not be logged in.');
      return null;
    }
    
    console.log('🔐 Sending AI request with token:', token.substring(0, 20) + '...');
    
    const response = await api.post('/ai/recommendations', airQualityData);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch AI recommendations:', error);
    if (error.response?.status === 401) {
      console.error('❌ Unauthorized - Token may be invalid or expired');
    }
    return null;
  }
};