import React, { useState, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import HealthRecommendations from './HealthRecommendations';
import { fetchAiRecommendations } from '../services/aiService';
import '../styles/HealthRecsModal.css';
import '../styles/Home.css';

const HealthRecsModal = ({ onClose, airQualityData, isLoggedIn, onLoginRequest, onSignupRequest }) => {
    const [recommendations, setRecommendations] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        const getRecommendations = async () => {
            if (!isLoggedIn) {
                return;
            }
            if (!airQualityData) {
                setError('Current air quality data is not available to generate recommendations.');
                return;
            }

            try {
                setIsLoading(true);
                setError('');
                
                const recs = await fetchAiRecommendations(airQualityData);
                if (recs && Object.keys(recs).length > 0) {
                    setRecommendations(recs);
                } else {
                    setError('Could not fetch recommendations. Please try again later.');
                }
            } catch (err) {
                console.error('Error fetching recommendations:', err);
                setError('Failed to generate recommendations.');
            } finally {
                setIsLoading(false);
            }
        };

        getRecommendations();
    }, [airQualityData, isLoggedIn]);

    const handleRetry = () => {
        setRetryCount(retryCount + 1);
        setRecommendations(null);
        setError('');
    };

    const renderBody = () => {
        if (!isLoggedIn) {
            return (
                <div className="auth-prompt-container">
                    <h3>Personalized Recommendations</h3>
                    <p>Log in or create an account to receive health advice tailored to your profile and local air quality.</p>
                    <div className="auth-prompt-actions">
                        <button className="auth-prompt-btn login" onClick={onLoginRequest}>Log In</button>
                        <button className="auth-prompt-btn signup" onClick={onSignupRequest}>Sign Up</button>
                    </div>
                </div>
            );
        }
        
        if (isLoading) {
            return (
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <p>Generating your personalized recommendations...</p>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '8px' }}>This may take a moment...</p>
                </div>
            );
        }
        
        if (error) {
            return (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p className="error-message" style={{ marginBottom: '16px' }}>{error}</p>
                    <button 
                        className="auth-prompt-btn login"
                        onClick={handleRetry}
                        style={{ marginTop: '12px' }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        
        if (recommendations) {
            return <HealthRecommendations recommendations={recommendations} />;
        }
        
        return null;
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content health-recs-modal">
                <div className="modal-header">
                    <h3 className="modal-title">Personalized Health Recommendations</h3>
                    <button className="modal-close-btn" onClick={onClose}>
                        <CloseIcon />
                    </button>
                </div>
                <div className="modal-body">
                    {renderBody()}
                </div>
            </div>
        </div>
    );
};

export default HealthRecsModal;