import React, { useState, useEffect } from 'react';
import '../styles/EmergencyModal.css';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LocalPoliceIcon from '@mui/icons-material/LocalPolice';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { findNearbyHospitals, getDistanceMatrix } from '../services/placesService';

const CONTACTS = [
  { label: 'Emergency', num: '112', Icon: WarningAmberIcon, cls: 'em-red' },
  { label: 'Ambulance', num: '102', Icon: LocalHospitalIcon, cls: 'em-green' },
  { label: 'Police', num: '100', Icon: LocalPoliceIcon, cls: 'em-blue' },
  { label: 'Fire', num: '101', Icon: LocalFireDepartmentIcon, cls: 'em-orange' },
];

const FIRST_AID = [
  'Stay calm and help the person sit upright in a comfortable position.',
  'If they have an inhaler (e.g. for asthma), assist them in using it.',
  'Loosen any tight clothing around the neck.',
  'Move to an area with better ventilation or cleaner air.',
];

/** Emergency info: one-tap helplines, breathing first-aid, and nearby hospitals. */
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
      <div className="modal-content emergency-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Emergency</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body emergency-body">
          <section className="em-section">
            <h4 className="em-title">Immediate medical assistance</h4>
            <p className="em-lead">
              Severe shortness of breath, chest pain, or dizziness? Call emergency services right away — tap a number to dial.
            </p>
            <div className="em-contacts">
              {CONTACTS.map(({ label, num, Icon, cls }) => (
                <a key={num} href={`tel:${num}`} className={`em-contact ${cls}`}>
                  <span className="em-contact-icon"><Icon /></span>
                  <span className="em-contact-text">
                    <span>{label}</span>
                    <strong>{num}</strong>
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section className="em-section">
            <h4 className="em-title">First aid — breathing difficulty</h4>
            <ol className="em-steps">
              {FIRST_AID.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </section>

          <section className="em-section">
            <h4 className="em-title">Nearby hospitals</h4>
            {isLoading && (
              <div className="em-loading">
                <div className="loading-spinner" />
                <p>Finding nearest hospitals…</p>
              </div>
            )}
            {error && <p className="em-error">{error}</p>}
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
                    <div className="hospital-actions">
                      {hospital.internationalPhoneNumber ? (
                        <a href={`tel:${hospital.internationalPhoneNumber}`} className="hospital-btn call">Call</a>
                      ) : (
                        <span className="hospital-btn unavailable">Number not available</span>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${hospital.displayName.text}, ${hospital.formattedAddress}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hospital-btn directions"
                      >Get directions</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default EmergencyModal;
