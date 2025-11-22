import React, { useState, useEffect } from 'react';
import '../styles/ProfileModal.css';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArticleIcon from '@mui/icons-material/Article';
import BookmarkIcon from '@mui/icons-material/Bookmark'; // Import icon
import SavedPlaces from './SavedPlaces'; // Import the new component
import { updateUser } from '../services/userService'; // Import the new service

const ProfileModal = ({ 
  user, 
  setUser, 
  onClose, 
  onLogout,
  // Add new handlers from Home
  onSelectOnMap,
  onSearchForLocation,
  onViewLocation,
  onDeleteLocation,
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSaveChanges = async () => {
    if (!user || !user.id) {
      alert('Cannot save changes. User is not properly loaded.');
      return;
    }
    setIsSaving(true);
    try {
      // Create a user object without location fields for saving
      const { primaryLocation, savedLocations, ...userToSave } = user;
      const updatedUser = await updateUser(user.id, userToSave);
      setUser(updatedUser); // Update state with response from server
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleReportUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    // Simulate AI analysis
    setTimeout(() => {
      const existingConditions = user.medicalConditions || '';
      const decodedCondition = "Hypertension (from report)";
      const newConditions = existingConditions ? `${existingConditions}, ${decodedCondition}` : decodedCondition;
      
      const newReport = {
        fileName: file.name,
        uploadDate: new Date().toISOString(),
        analysisResult: decodedCondition,
      };

      const updatedReports = [...(user.pastReports || []), newReport];

      setUser(prevUser => ({ 
        ...prevUser, 
        medicalConditions: newConditions,
        pastReports: updatedReports 
      }));

      setIsAnalyzing(false);
      alert(`Analysis complete. Medical conditions and past reports have been updated.`);
    }, 2000);
  };

  // Render profile tab
  const renderProfileTab = () => {
    return (
      <div className="tab-content">
        <div className="form-section">
          <h4 className="form-section-title">Personal Information</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={user.name || ''} onChange={e => setUser({...user, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={user.email || ''} onChange={e => setUser({...user, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="tel" 
                value={user.phone || ''} 
                onChange={e => setUser({...user, phone: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input 
                type="date" 
                value={user.dob || ''} 
                onChange={e => setUser({...user, dob: e.target.value})} 
              />
            </div>
          </div>
        </div>

        <div className="form-section action-section">
          <button className="action-btn" disabled><VpnKeyIcon /> Change Password</button>
          <button className="action-btn save-btn" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? 'Saving...' : <><SaveIcon /> Save Changes</>}
          </button>
        </div>
      </div>
    );
  };

  // Render saved places tab
  const renderSavedPlacesTab = () => (
    <div className="tab-content">
      <div className="form-section">
        <h4 className="form-section-title">Saved Places</h4>
        <SavedPlaces
          user={user}
          onAdd={onSelectOnMap}
          onSearch={onSearchForLocation}
          onView={onViewLocation}
          onEdit={onSelectOnMap} // Reuses the select on map flow for editing
          onDelete={onDeleteLocation}
        />
      </div>
    </div>
  );

  // Render health tab
  const renderHealthTab = () => (
    <div className="tab-content">
      <div className="form-section">
        <h4 className="form-section-title">Vitals</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>Height (cm)</label>
            <input 
              type="text" 
              value={user.height || ''} 
              onChange={e => setUser({...user, height: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>Weight (kg)</label>
            <input 
              type="text" 
              value={user.weight || ''} 
              onChange={e => setUser({...user, weight: e.target.value})} 
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="text" value={calculateAge(user.dob)} readOnly disabled />
          </div>
          <div className="form-group">
            <label>Blood Type</label>
            <select
              value={user.bloodType || ''}
              onChange={e => setUser({...user, bloodType: e.target.value})}
            >
              <option value="">Select...</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">Medical Conditions</h4>
        <div className="form-group">
          <label>Conditions</label>
          <textarea 
            rows="4" 
            placeholder="e.g., Asthma, Hay Fever, COPD"
            value={user.medicalConditions || ''}
            onChange={e => setUser({...user, medicalConditions: e.target.value})}
          ></textarea>
        </div>
        <div className="report-upload-section">
          <div className="upload-btn-wrapper">
            <button className="upload-btn" disabled={isAnalyzing}>
              <UploadFileIcon /> Upload Report
            </button>
            <input type="file" name="report" onChange={handleReportUpload} disabled={isAnalyzing} accept=".pdf,.jpg,.png" />
          </div>
          {isAnalyzing && (
            <span className="analyzing-text">
              <div className="analyzing-spinner"></div>
              AI is analyzing your report...
            </span>
          )}
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">Past Reports</h4>
        {user.pastReports && user.pastReports.length > 0 ? (
          <div className="past-reports-list">
            {user.pastReports.map((report, index) => (
              <div key={index} className="report-item">
                <div className="report-item-info">
                  <span className="report-name">{report.fileName}</span>
                  <span className="report-details">
                    Uploaded on {new Date(report.uploadDate).toLocaleDateString()} - Analysis: {report.analysisResult}
                  </span>
                </div>
                <div className="report-item-actions">
                  <button className="view-btn" onClick={() => alert('This is a mock view action.')}>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state" style={{padding: '16px 0'}}>No reports uploaded yet.</p>
        )}
      </div>

      <div className="form-section action-section">
        <button className="action-btn save-btn" onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving ? 'Saving...' : <><SaveIcon /> Save Health Profile</>}
        </button>
      </div>
    </div>
  );

  // Render logout tab
  const renderLogoutTab = () => (
    <div className="tab-content">
      <div className="logout-section">
        <h4 className="form-section-title">Logout</h4>
        <div className="logout-warning">
          <p>You will be returned to the login screen.</p>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Confirm Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile-modal modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <span className="profile-header-main">Profile Settings</span>
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="profile-modal-body">
          {/* Tabs navigation */}
          <div className="profile-tabs">
            <button
              className={`profile-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span>👤</span> Profile
            </button>
            <button
              className={`profile-tab ${activeTab === 'savedPlaces' ? 'active' : ''}`}
              onClick={() => setActiveTab('savedPlaces')}
            >
              <BookmarkIcon /> Saved Places
            </button>
            <button
              className={`profile-tab ${activeTab === 'health' ? 'active' : ''}`}
              onClick={() => setActiveTab('health')}
            >
              <span>❤️</span> Health
            </button>
            <button
              className={`profile-tab logout-tab`}
              onClick={() => setActiveTab('logout')}
            >
              <span>🚪</span> Logout
            </button>
          </div>

          {/* Tab content */}
          <div className="profile-tab-content">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'savedPlaces' && renderSavedPlacesTab()}
            {activeTab === 'health' && renderHealthTab()}
            {activeTab === 'logout' && renderLogoutTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;