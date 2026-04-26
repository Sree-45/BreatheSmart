import api from './api';

/**
 * Calls Spring Boot's /api/ai/recommendations, which proxies to the
 * Python rag-service /recommend. Returns the full envelope so callers can
 * render the recommendation, the retrieved sources, and the fallback flag.
 *
 * Shape: { recommendation: { primary: [...], secondary: [...] },
 *          sources: [{source, scope, snippet, score}, ...],
 *          fallback: boolean,
 *          latency_ms: number }
 */
export const fetchAiRecommendations = async (airQualityData) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('No auth token; user is not logged in.');
    return null;
  }

  try {
    const { data } = await api.post('/ai/recommendations', airQualityData);
    return data;
  } catch (error) {
    console.error('fetchAiRecommendations failed:', error?.response?.data || error.message);
    if (error?.response?.status === 401) {
      console.error('Unauthorized — token may be expired.');
    }
    return null;
  }
};

/**
 * Triggers the LangGraph agent. The agent fetches AQI for `city` itself
 * and runs the RAG tool — Spring Boot just proxies.
 *
 * Returns: { answer: string, trace: [{type, content, tool_calls}, ...] }
 */
export const fetchAgenticAnalysis = async ({ city, age, medicalConditions, question }) => {
  try {
    const { data } = await api.post('/ai/agent', {
      city,
      age: age ?? null,
      medical_conditions: medicalConditions ?? null,
      question: question ?? null,
    });
    return data;
  } catch (error) {
    console.error('fetchAgenticAnalysis failed:', error?.response?.data || error.message);
    return null;
  }
};

/**
 * Spring AI ChatClient summary — direct LLM call, no RAG.
 * Returns: { summary: string }
 */
export const fetchDailySummary = async (airQualityData) => {
  try {
    const { data } = await api.post('/ai/summary', airQualityData);
    return data;
  } catch (error) {
    console.error('fetchDailySummary failed:', error?.response?.data || error.message);
    return null;
  }
};

/**
 * Real multipart upload of a health report. Spring Boot saves the file,
 * extracts text via Tika, forwards the text to the rag-service for per-user
 * vector indexing, and persists a Report on the user document.
 *
 * Returns: { report: {...}, pastReports: [...] }
 */
export const uploadHealthReport = async (userId, file) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post(`/users/${userId}/reports`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
