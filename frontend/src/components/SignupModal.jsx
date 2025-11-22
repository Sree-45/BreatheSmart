import React, { useState } from 'react';
import '../styles/AuthModal.css';
import CloseIcon from '@mui/icons-material/Close';
import { signup } from '../services/authService';

const SignupModal = ({ onClose, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { confirmPassword, ...signupData } = formData;
      await signup(signupData);
      alert('Signup successful! Please log in.');
      onSwitchToLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content auth-modal signup">
        <div className="auth-header">
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Start your journey with BreatheSmart.</p>
        </div>
        <button className="modal-close-btn" onClick={onClose}>
            <CloseIcon />
        </button>
        <form onSubmit={handleSignup} className="auth-form">
          {error && <p className="auth-error">{error}</p>}
          <div className="auth-form-grid">
            <div className="input-group full-width">
              <label htmlFor="name">Full Name<span className="required-star">*</span></label>
              <input id="name" type="text" required placeholder="Sreeshanth S" value={formData.name} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label htmlFor="phone">Phone Number<span className="required-star">*</span></label>
              <input id="phone" type="tel" required placeholder="9876543210" value={formData.phone} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input id="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password<span className="required-star">*</span></label>
              <input id="password" type="password" required placeholder="••••••••" value={formData.password} onChange={handleChange} />
            </div>
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password<span className="required-star">*</span></label>
              <input id="confirmPassword" type="password" required placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} />
            </div>
          </div>
          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? <div className="btn-spinner"></div> : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">
          <span>Already have an account? </span>
          <a onClick={onSwitchToLogin} className="auth-footer-link">Log In</a>
        </div>
      </div>
    </div>
  );
};

export default SignupModal;