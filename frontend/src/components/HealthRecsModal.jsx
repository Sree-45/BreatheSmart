import React, { useState, useEffect, useCallback } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import HealthRecommendations from './HealthRecommendations';
import SourcesPanel from './SourcesPanel';
import AgentAnalysisPanel from './AgentAnalysisPanel';
import { fetchAiRecommendations } from '../services/aiService';
import '../styles/HealthRecsModal.css';
import '../styles/Home.css';

const HealthRecsModal = ({
  onClose,
  airQualityData,
  isLoggedIn,
  user,
  onLoginRequest,
  onSignupRequest,
}) => {
  const [activeTab, setActiveTab] = useState('rag'); // 'rag' | 'agent'
  const [envelope, setEnvelope] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRecommendations = useCallback(async () => {
    if (!isLoggedIn) return;
    if (!airQualityData) {
      setError('Current air quality data is not available yet.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAiRecommendations(airQualityData);
      if (!data) {
        setError('The recommendation service did not respond. Please try again.');
        return;
      }
      setEnvelope(data);
    } catch (e) {
      console.error('Recommendation request failed:', e);
      setError('Failed to generate recommendations.');
    } finally {
      setIsLoading(false);
    }
  }, [airQualityData, isLoggedIn]);

  useEffect(() => {
    if (activeTab === 'rag' && !envelope && !isLoading && !error) {
      loadRecommendations();
    }
  }, [activeTab, envelope, isLoading, error, loadRecommendations]);

  const renderRagBody = () => {
    if (isLoading) {
      return (
        <div className="loading-container" role="status">
          <div className="loading-spinner" />
          <p>Generating personalized recommendations…</p>
          <p className="loading-subtext">Retrieving relevant guidelines and asking Gemini.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="recs-error-state">
          <p className="error-message">{error}</p>
          <button type="button" className="auth-prompt-btn login" onClick={loadRecommendations}>
            <ReplayIcon fontSize="small" /> Try again
          </button>
        </div>
      );
    }

    if (envelope) {
      return (
        <>
          <HealthRecommendations
            recommendation={envelope.recommendation}
            fallback={!!envelope.fallback}
          />
          <SourcesPanel sources={envelope.sources} latencyMs={envelope.latency_ms} />
        </>
      );
    }

    return null;
  };

  const renderAuthPrompt = () => (
    <div className="auth-prompt-container">
      <h3>Personalized recommendations</h3>
      <p>Log in or create an account to receive health advice tailored to your profile and your local air quality.</p>
      <div className="auth-prompt-actions">
        <button className="auth-prompt-btn login" onClick={onLoginRequest}>Log in</button>
        <button className="auth-prompt-btn signup" onClick={onSignupRequest}>Sign up</button>
      </div>
    </div>
  );

  const renderBody = () => {
    if (!isLoggedIn) return renderAuthPrompt();

    return (
      <div className="health-recs-tabs-wrapper">
        <div className="health-recs-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'rag'}
            className={`health-recs-tab ${activeTab === 'rag' ? 'active' : ''}`}
            onClick={() => setActiveTab('rag')}
          >
            Recommendations
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'agent'}
            className={`health-recs-tab ${activeTab === 'agent' ? 'active' : ''}`}
            onClick={() => setActiveTab('agent')}
          >
            Agentic analysis
          </button>
        </div>
        <div className="health-recs-tab-panel">
          {activeTab === 'rag' ? renderRagBody() : <AgentAnalysisPanel user={user} />}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content health-recs-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Personalized health recommendations</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">{renderBody()}</div>
      </div>
    </div>
  );
};

export default HealthRecsModal;
