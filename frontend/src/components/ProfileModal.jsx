import React, { useState } from 'react';
import '../styles/ProfileModal.css';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SavedPlaces from './SavedPlaces';
import { updateUser } from '../services/userService';
import { uploadHealthReport } from '../services/aiService';

const formatBytes = (n) => {
  if (typeof n !== 'number') return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const ProfileModal = ({
  user,
  setUser,
  onClose,
  onLogout,
  onSelectOnMap,
  onSearchForLocation,
  onViewLocation,
  onDeleteLocation,
  onUseCurrentLocation,
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null); // { kind: 'ok'|'error', text }
  const [healthStatus, setHealthStatus] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { kind, text }

  const handleSaveChanges = async (statusSetter) => {
    if (!user || !user.id) {
      statusSetter({ kind: 'error', text: 'User is not loaded yet.' });
      return;
    }
    setIsSaving(true);
    statusSetter(null);
    try {
      // Send the full user — including primaryLocation and savedLocations — so a
      // save from the modal does not silently wipe location data the user added
      // outside the form (e.g. via "Add from Map").
      const updatedUser = await updateUser(user.id, user);
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      statusSetter({ kind: 'ok', text: 'Saved.' });
    } catch (error) {
      console.error('Failed to save profile:', error);
      statusSetter({ kind: 'error', text: error?.message || 'Save failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    const today = new Date();
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleReportUpload = async (event) => {
    const file = event.target.files[0];
    event.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!user?.id) {
      setUploadStatus({ kind: 'error', text: 'You need to be signed in to upload a report.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ kind: 'progress', text: `Uploading ${file.name} (${formatBytes(file.size)})…` });

    try {
      const result = await uploadHealthReport(user.id, file);
      if (result?.pastReports) {
        setUser((prev) => ({ ...prev, pastReports: result.pastReports }));
      }
      setUploadStatus({
        kind: 'ok',
        text: `${file.name} uploaded. ${result?.report?.analysisResult || 'Indexed for personalization.'}`,
      });
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        'Upload failed.';
      setUploadStatus({ kind: 'error', text: detail });
    } finally {
      setIsUploading(false);
    }
  };

  const renderStatus = (status) => {
    if (!status) return null;
    const Icon = status.kind === 'ok' ? CheckCircleOutlineIcon : ErrorOutlineIcon;
    return (
      <p className={`inline-status inline-status-${status.kind}`} role="status">
        {status.kind !== 'progress' && <Icon fontSize="small" />}
        {status.kind === 'progress' && <span className="inline-status-spinner" />}
        <span>{status.text}</span>
      </p>
    );
  };

  const renderProfileTab = () => (
    <div className="tab-content">
      <div className="form-section">
        <h4 className="form-section-title">Personal Information</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={user.name || ''}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={user.email || ''}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={user.phone || ''}
              onChange={(e) => setUser({ ...user, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              value={user.dob || ''}
              onChange={(e) => setUser({ ...user, dob: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4 className="form-section-title">Primary Location</h4>
        {user.primaryLocation ? (
          <div className="primary-location-row">
            <div className="primary-location-info">
              <span className="primary-location-name">{user.primaryLocation.name}</span>
              {(user.primaryLocation.latitude != null && user.primaryLocation.longitude != null) && (
                <span className="primary-location-coords">
                  {Number(user.primaryLocation.latitude).toFixed(4)}, {Number(user.primaryLocation.longitude).toFixed(4)}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="empty-state" style={{ padding: '8px 0' }}>No primary location set.</p>
        )}
        <div className="primary-location-actions">
          <button type="button" className="action-btn" onClick={() => onSelectOnMap('primary')}>
            Set from Map
          </button>
          <button type="button" className="action-btn" onClick={() => onSearchForLocation('primary')}>
            Set from Search
          </button>
          {onUseCurrentLocation && (
            <button type="button" className="action-btn" onClick={onUseCurrentLocation}>
              <MyLocationIcon fontSize="small" /> Use Current Location
            </button>
          )}
        </div>
      </div>

      <div className="form-section action-section">
        <button className="action-btn" disabled>
          <VpnKeyIcon /> Change Password
        </button>
        <button
          className="action-btn save-btn"
          onClick={() => handleSaveChanges(setProfileStatus)}
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : <><SaveIcon /> Save Changes</>}
        </button>
      </div>
      {renderStatus(profileStatus)}
    </div>
  );

  const renderSavedPlacesTab = () => (
    <div className="tab-content">
      <div className="form-section">
        <h4 className="form-section-title">Saved Places</h4>
        <SavedPlaces
          user={user}
          onAdd={onSelectOnMap}
          onSearch={onSearchForLocation}
          onView={onViewLocation}
          onEdit={onSelectOnMap}
          onDelete={onDeleteLocation}
        />
      </div>
    </div>
  );

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
              onChange={(e) => setUser({ ...user, height: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Weight (kg)</label>
            <input
              type="text"
              value={user.weight || ''}
              onChange={(e) => setUser({ ...user, weight: e.target.value })}
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
              onChange={(e) => setUser({ ...user, bloodType: e.target.value })}
            >
              <option value="">Select…</option>
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
            placeholder="e.g. Asthma, Hay Fever, COPD"
            value={user.medicalConditions || ''}
            onChange={(e) => setUser({ ...user, medicalConditions: e.target.value })}
          />
        </div>

        <div className="report-upload-section">
          <div className="upload-btn-wrapper">
            <button className="upload-btn" disabled={isUploading} type="button">
              <UploadFileIcon /> {isUploading ? 'Uploading…' : 'Upload Report'}
            </button>
            <input
              type="file"
              name="report"
              onChange={handleReportUpload}
              disabled={isUploading}
              accept=".pdf,.jpg,.jpeg,.png,.docx,.txt"
            />
          </div>
          <p className="upload-hint">
            PDF, image, or text. Extracted content is indexed privately for your future recommendations.
          </p>
          {renderStatus(uploadStatus)}
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
                    Uploaded {report.uploadDate ? new Date(report.uploadDate).toLocaleDateString() : '—'}
                    {report.analysisResult ? ` · ${report.analysisResult}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state" style={{ padding: '16px 0' }}>No reports uploaded yet.</p>
        )}
      </div>

      <div className="form-section action-section">
        <button
          className="action-btn save-btn"
          onClick={() => handleSaveChanges(setHealthStatus)}
          disabled={isSaving}
        >
          {isSaving ? 'Saving…' : <><SaveIcon /> Save Health Profile</>}
        </button>
      </div>
      {renderStatus(healthStatus)}
    </div>
  );

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
      <div className="profile-modal modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <span className="profile-header-main">Profile Settings</span>
          </h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="profile-modal-body">
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
