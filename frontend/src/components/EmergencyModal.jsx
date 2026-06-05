import React, { useState, useEffect } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { findNearbyHospitals, getDistanceMatrix } from '../services/placesService';

/** Emergency info: helplines, breathing first-aid, and nearby hospitals. */
const EmergencyModal = ({ onClose, location }) => {
  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHospitals = async () => {
      if (!location) {
        setError('Current location is not available to find hospitals.');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const nearbyHospitals = await findNearbyHospitals(location);
        if (nearbyHospitals.length > 0) {
          const hospitalsWithDistance = await getDistanceMatrix(location, nearbyHospitals);
          setHospitals(hospitalsWithDistance);
        } else {
          setError('Could not find any hospitals nearby.');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching hospitals.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHospitals();
  }, [location]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Emergency Contacts &amp; Procedures</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-section">
            <h4 className="modal-subtitle">Immediate Medical Assistance</h4>
            <p>If you are experiencing severe shortness of breath, chest pain, or dizziness, please contact emergency services immediately.</p>
            <ul>
              <li><strong>National Emergency Number:</strong> 112</li>
              <li><strong>Ambulance:</strong> 102</li>
              <li><strong>Police:</strong> 100</li>
              <li><strong>Fire:</strong> 101</li>
            </ul>
          </div>
          <div className="modal-section">
            <h4 className="modal-subtitle">First Aid for Breathing Difficulties</h4>
            <p>1. Stay calm and help the person to a comfortable position, usually sitting upright.</p>
            <p>2. If they have an inhaler (e.g., for asthma), assist them in using it.</p>
            <p>3. Loosen any tight clothing around the neck.</p>
            <p>4. Move to an area with better ventilation or cleaner air if possible.</p>
          </div>
          <div className="modal-section">
            <h4 className="modal-subtitle">Nearby Hospitals</h4>
            {isLoading && (
              <div className="loading-container" style={{ padding: '20px 0' }}>
                <div className="loading-spinner" />
                <p>Finding nearest hospitals...</p>
              </div>
            )}
            {error && <p className="auth-error">{error}</p>}
            {!isLoading && !error && hospitals.length > 0 && (
              <div className="hospitals-list">
                {hospitals.map((hospital) => (
                  <div key={hospital.id} className="hospital-item">
                    <div className="hospital-info">
                      <div className="hospital-name">{hospital.displayName.text}</div>
                      <div className="hospital-address">{hospital.formattedAddress}</div>
                      {hospital.distance && (
                        <div className="hospital-distance">
                          Approx. {hospital.distance} away ({hospital.duration})
                        </div>
                      )}
                    </div>
                    {hospital.internationalPhoneNumber && (
                      <a href={`tel:${hospital.internationalPhoneNumber}`} className="hospital-call-btn">
                        Call
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!isLoading && !error && hospitals.length === 0 && !location && (
              <p>Enable location services to find nearby hospitals.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyModal;
