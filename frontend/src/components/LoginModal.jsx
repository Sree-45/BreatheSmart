import React, { useState } from 'react';
import '../styles/AuthModal.css'; // Use the new shared CSS
import CloseIcon from '@mui/icons-material/Close';
import { login } from '../services/authService';

const LoginModal = ({ onClose, onLoginSuccess, onSwitchToSignup }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userData = await login({ identifier, password });
      onLoginSuccess(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content auth-modal">
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Log in to access your dashboard.</p>
        </div>
        <button className="modal-close-btn" onClick={onClose}>
            <CloseIcon />
        </button>
        <form onSubmit={handleLogin} className="auth-form">
          {error && <p className="auth-error">{error}</p>}
          <div className="input-group">
            <label htmlFor="identifier">Email or Phone Number</label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="you@example.com or 9876543210"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? <div className="btn-spinner"></div> : 'Login'}
          </button>
        </form>
        <div className="auth-footer">
            <span>Don't have an account? </span>
            <a onClick={onSwitchToSignup} className="auth-footer-link">Sign Up</a>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;