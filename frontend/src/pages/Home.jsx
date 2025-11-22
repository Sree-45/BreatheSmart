import React, { useState, useEffect, useCallback, useRef } from 'react';
import MapComponent from '../components/MapComponent';
import '../styles/Home.css';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import HealthRecommendations from '../components/HealthRecommendations';
import {
    fetchCurrentConditions,
    fetchHistoricalData,
    fetchForecastData,
    getPreferredAqi,
    GOOGLE_MAPS_API_KEY
} from '../services/airQualityService';
import { findNearbyHospitals, getDistanceMatrix } from '../services/placesService'; 
import AqiGauge from '../components/AqiGauge';
import Pollutants from '../components/Pollutants';
import AqiHistoryChart from '../components/AqiHistoryChart';
import AqiForecastChart from '../components/AqiForecastChart';
import HeatmapToggle from '../components/HeatmapToggle';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal'; 
import ProfileModal from '../components/ProfileModal';
import HealthRecsModal from '../components/HealthRecsModal';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import SosIcon from '@mui/icons-material/Sos';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Modal component for pollutant details
const PollutantModal = ({ pollutant, onClose }) => {
  if (!pollutant) return null;
  
  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">{pollutant.displayName} ({pollutant.fullName})</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">
          <div className="modal-concentration">
            <span className="modal-label">Concentration:</span> 
            <span className="modal-value">{pollutant.concentration.value} {pollutant.concentration.units.replace(/_/g, ' ')}</span>
          </div>
          
          <div className="modal-section">
            <h4 className="modal-subtitle">Sources</h4>
            <p>{pollutant.additionalInfo?.sources || "Information not available"}</p>
          </div>
          
          <div className="modal-section">
            <h4 className="modal-subtitle">Health Effects</h4>
            <p>{pollutant.additionalInfo?.effects || "Information not available"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Chart modal component
const ChartModal = ({ chartType, data, onClose }) => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: chartType === 'history' ? 'Historical AQI Data' : 'AQI Forecast Data',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#555',
        borderColor: '#2563eb',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            const sourceData = chartType === 'history' ? data.hoursInfo : data.hourlyForecasts;
            return `${chartType === 'history' ? 'Historical' : 'Forecast'} AQI - ${formatDateTime(sourceData[idx].dateTime)}`;
          },
          label: (item) => {
            const idx = item.dataIndex;
            const sourceData = chartType === 'history' ? data.hoursInfo : data.hourlyForecasts;
            const aqi = getPreferredAqi(sourceData[idx].indexes); // Use helper here
            if (!aqi) return 'No data';
            return [
              `AQI: ${aqi.aqi} - ${aqi.category}`,
              `Dominant: ${aqi.dominantPollutant.toUpperCase()}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        title: {
          display: true,
          text: 'Air Quality Index'
        }
      }
    }
  };
  
  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (!data || (chartType === 'history' && !data.hoursInfo) || (chartType === 'forecast' && !data.hourlyForecasts)) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content modal-large">
          <div className="modal-header">
            <h3 className="modal-title">
              {chartType === 'history' ? 'Historical Air Quality' : 'Air Quality Forecast'}
            </h3>
            <button className="modal-close-btn" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
          <div className="modal-body chart-modal-body">
            <div className="loading-message">No data available</div>
          </div>
        </div>
      </div>
    );
  }
  
  const chartData = {
    labels: (chartType === 'history' ? data.hoursInfo : data.hourlyForecasts)
      .map(hour => formatDateTime(hour.dateTime)),
    datasets: [
      {
        label: chartType === 'history' ? 'Historical AQI' : 'Forecast AQI',
        data: (chartType === 'history' ? data.hoursInfo : data.hourlyForecasts)
          .map(hour => getPreferredAqi(hour.indexes)?.aqi), // Use helper here
        fill: false,
        backgroundColor: chartType === 'history' ? '#2563eb' : '#1741a6',
        borderColor: chartType === 'history' ? '#2563eb' : '#1741a6',
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderDash: chartType === 'forecast' ? [5, 5] : []
      }
    ]
  };
  
  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h3 className="modal-title">
            {chartType === 'history' ? 'Historical Air Quality' : 'Air Quality Forecast'}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body chart-modal-body">
          <Line data={chartData} options={chartOptions} height={400} />
        </div>
      </div>
    </div>
  );
};

// Emergency Modal Component
const EmergencyModal = ({ onClose, location }) => {
  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHospitals = async () => {
      if (!location) {
        setError("Current location is not available to find hospitals.");
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
          setError("Could not find any hospitals nearby.");
        }
      } catch (err) {
        setError(err.message || "An error occurred while fetching hospitals.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHospitals();
  }, [location]);


  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Emergency Contacts & Procedures</h3>
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
              <div className="loading-container" style={{padding: '20px 0'}}>
                <div className="loading-spinner" />
                <p>Finding nearest hospitals...</p>
              </div>
            )}
            {error && <p className="auth-error">{error}</p>}
            {!isLoading && !error && hospitals.length > 0 && (
              <div className="hospitals-list">
                {hospitals.map(hospital => (
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


export default function Home() {
    const mapRef = useRef(null);
    const searchInputRef = useRef(null); // Ref for the search input
    const justSelectedPrediction = useRef(false); // Add this ref
    const [isMapReady, setIsMapReady] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Loading Map...');
    const [collapsed, setCollapsed] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [predictions, setPredictions] = useState([]); // For autocomplete
    const [isSearching, setIsSearching] = useState(false); // For autocomplete loading
    const [showHeatmap, setShowHeatmap] = useState(true);
    
    // Data states initialized as null or empty
    const [currentData, setCurrentData] = useState(null);
    const [historyData, setHistoryData] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [nationalAqi, setNationalAqi] = useState(null);
    
    // Loading and error states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Location state - Start with null to wait for initial geolocation
    const [location, setLocation] = useState(null);
    
    // Modal states
    const [selectedPollutant, setSelectedPollutant] = useState(null);
    const [chartModalData, setChartModalData] = useState(null);
    const [userMarkerPosition, setUserMarkerPosition] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false); // State for SignupModal
    const [showHealthRecsModal, setShowHealthRecsModal] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const [locationToUpdate, setLocationToUpdate] = useState(null); // To track which location is being updated
    const [loginPrompt, setLoginPrompt] = useState(''); // For prompting login for features

    // Lifted user state from ProfileModal
    const [user, setUser] = useState({
        name: 'Sreeshanth S',
        email: 'sreeshanth@example.com',
        phone: '987-654-3210',
        dob: '1997-08-15',
        location: 'Hyderabad, India',
        height: '175 cm',
        weight: '70 kg',
        medicalConditions: 'Asthma, Pollen Allergy',
        savedLocations: [] // Corrected from favoriteLocations to savedLocations
    });

    // Add this handler
    const handleLocationConfirm = (location, type) => {
      if (type === 'primary') {
        setUser({ ...user, location: `${location.lat}, ${location.lng}` });
      } else if (type === 'favorite') {
        // This will be handled in ProfileModal via setUser
      }
    };

    // Effect to check for existing login session on component mount
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');
        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
                setIsLoggedIn(true);
            } catch (e) {
                console.error("Failed to parse user data from localStorage", e);
                // Clear corrupted data
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
            }
        }
    }, []);

    // Load Google Maps API and attempt initial location fetch
    useEffect(() => {
        const initialize = async () => {
            // First, try to get the user's location.
            try {
                await handleLocate(true);
            } catch (error) {
                console.warn("Initial geolocation failed. The error handler will set a default location.");
            }
            // Then, load the Google Maps script. `initMap` will set isMapReady.
            loadGoogleMaps();
        };

        initialize();
        // This effect should only run once on component mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    // Fetch all air quality data when location changes
    useEffect(() => {
        if (location) {
            fetchAirQualityData(location);
        }
    }, [location]);

    // Function to fetch all air quality data for a location
    const fetchAirQualityData = useCallback(async (loc) => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Fetch current conditions - this is the most important data
            const currentResult = await fetchCurrentConditions({
                latitude: loc.latitude,
                longitude: loc.longitude
            });
            setCurrentData(currentResult);
            
            // No longer need to separately extract national AQI here
            
            // Try to fetch historical data, but don't fail the entire operation if it fails
            try {
                const historyResult = await fetchHistoricalData({
                    latitude: loc.latitude,
                    longitude: loc.longitude
                }, 24); // Last 24 hours
                setHistoryData(historyResult);
            } catch (historyError) {
                console.warn("Could not load historical data:", historyError);
                setHistoryData(null);
            }
            
            // Try to fetch forecast data, but don't fail the entire operation if it fails
            try {
                const forecastResult = await fetchForecastData({
                    latitude: loc.latitude,
                    longitude: loc.longitude
                });

                if (forecastResult) {
                    setForecastData(forecastResult);
                } else {
                    setForecastData(null);
                }
            } catch (forecastError) {
                console.warn("Could not load forecast data:", forecastError);
                setForecastData(null);
            }
            
            setIsLoading(false);
        } catch (err) {
            console.error("Error fetching air quality data:", err);
            setError("Failed to load air quality data. Please try again.");
            setIsLoading(false);
        }
        
    }, []);

    const loadGoogleMaps = () => {
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
        
        if (existingScript) {
            existingScript.addEventListener('load', () => {
                setIsMapReady(true);
                setStatusMessage('Map loaded successfully!');
            });
            existingScript.addEventListener('error', () => {
                setStatusMessage('Failed to load Google Maps. Please check your API key.');
            });
            return;
        }
        
        setStatusMessage('Loading Google Maps...');
        
        window.initMap = function() {
            setIsMapReady(true);
            setStatusMessage('Map loaded successfully!');
        };
        
        const script = document.createElement('script');
        // Use loading=async parameter as recommended by Google
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=marker,places&v=weekly&loading=async`;
        
        script.onerror = () => {
            setStatusMessage('Failed to load Google Maps. Please check your API key and internet connection.');
        };
        
        document.head.appendChild(script);
    };

    // Handler for search
    const handleSearch = (e) => {
        e.preventDefault();
        // This function is now primarily for submitting a raw text search if needed,
        // but the main functionality will be handled by selecting a prediction.
        if (!searchValue.trim()) return;
        
        // The original geocoding logic can be kept as a fallback
        if (window.google && window.google.maps && window.google.maps.Geocoder) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: searchValue }, (results, status) => {
                if (status === "OK" && results[0]) {
                    const newLoc = {
                        latitude: results[0].geometry.location.lat(),
                        longitude: results[0].geometry.location.lng(),
                        name: searchValue
                    };
                    setLocation(newLoc);
                    setPredictions([]); // Clear predictions
                    
                    // If map instance is available, pan to the new location
                    if (mapRef.current && mapRef.current.panTo) {
                        mapRef.current.panTo(
                            new window.google.maps.LatLng(newLoc.latitude, newLoc.longitude)
                        );
                    }
                } else {
                    setError(`Could not find location: ${searchValue}`);
                }
            });
        }
    };

    // --- NEW: Autocomplete Functions ---

    // Fetch predictions from Google Places Autocomplete API
    const fetchPredictions = useCallback(async (input) => {
        if (!input || input.length < 3) {
            setPredictions([]);
            return;
        }
        setIsSearching(true);

        try {
            const response = await fetch(`https://places.googleapis.com/v1/places:autocomplete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                    'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text'
                },
                body: JSON.stringify({
                    input: input,
                    // Optionally bias results to the current map view
                    locationBias: mapRef.current?.getBounds ? {
                        rectangle: mapRef.current.getBounds()
                    } : undefined
                })
            });

            if (!response.ok) {
                throw new Error('Autocomplete request failed');
            }

            const data = await response.json();
            setPredictions(data.suggestions || []);
        } catch (error) {
            console.error("Autocomplete error:", error);
            setPredictions([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Handle selecting a prediction from the list
    const handleSelectPrediction = useCallback(async (placeId, placeText) => {
        justSelectedPrediction.current = true; // Set the flag before updating state
        setSearchValue(placeText);
        setPredictions([]); // This will hide the dropdown

        // Use the Places Service to get details (including geometry)
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            setError("Places service is not available.");
            return;
        }
        
        // The map needs a div to attach the PlacesService to, it doesn't have to be the map div.
        // We can create a temporary one.
        const attributionsContainer = document.createElement('div');
        const placesService = new window.google.maps.places.PlacesService(attributionsContainer);
        
        placesService.getDetails({
            placeId: placeId,
            fields: ['name', 'geometry.location']
        }, (place, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
                const newLoc = {
                    latitude: place.geometry.location.lat(),
                    longitude: place.geometry.location.lng(),
                    name: place.name
                };
                // This updates the side panel by triggering the data fetch useEffect
                setLocation(newLoc);

                // This pans the map to the new location and adds a marker
                if (mapRef.current && mapRef.current.panToAndMark) {
                    mapRef.current.panToAndMark(place.geometry.location);
                }
            } else {
                setError(`Could not get details for location: ${placeText}`);
            }
        });
    }, [mapRef]);

    // Effect to fetch predictions when searchValue changes
    useEffect(() => {
        // If a prediction was just selected, don't fetch new ones.
        if (justSelectedPrediction.current) {
            justSelectedPrediction.current = false; // Reset the flag
            return;
        }

        // Clear predictions if search value is empty
        if (!searchValue) {
            setPredictions([]);
            return;
        }

        const handler = setTimeout(() => {
            fetchPredictions(searchValue);
        }, 300); // Debounce API calls

        return () => {
            clearTimeout(handler);
        };
    }, [searchValue, fetchPredictions]);
    
    // Reverse geocode helper
    const reverseGeocode = useCallback(async (lat, lng) => {
        if (!(window.google && window.google.maps && window.google.maps.Geocoder)) return null;
        return new Promise(resolve => {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === "OK" && results && results.length) {
                    // Try to extract city/locality
                    const comp = results[0].address_components;
                    const city = comp.find(c => c.types.includes("locality"))?.long_name
                              || comp.find(c => c.types.includes("administrative_area_level_2"))?.long_name
                              || comp.find(c => c.types.includes("administrative_area_level_1"))?.long_name
                              || comp.find(c => c.types.includes("country"))?.long_name;
                    resolve(city || null);
                } else {
                    resolve(null);
                }
            });
        });
    }, []);

    const handleLocate = (isInitialLoad = false) => new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            const error = { code: 2, message: "Geolocation is not supported by your browser." };
            if (isInitialLoad) {
                handleLocationError(error, true);
            }
            setError("Geolocation is not supported by your browser.");
            return reject(error);
        }

        const options = {
            enableHighAccuracy: true,      // ✅ CRITICAL: Request GPS
            timeout: 15000,                // Increased timeout
            maximumAge: 0                  // Always get fresh GPS data
        };

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const accuracy = pos.coords.accuracy;

                // ✅ Log accuracy to verify GPS precision
                console.log(`✅ Location Received - Accuracy: ${accuracy.toFixed(1)}m`);
                console.log(`📍 Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

                // NEW: Check if the accuracy is good enough (e.g., under 1000 meters)
                if (accuracy > 1000) {
                    console.warn(`❌ Poor accuracy (${accuracy.toFixed(1)}m). Treating as failure.`);
                    const error = {
                        code: 4, // Custom code for poor accuracy
                        message: "Location accuracy is too low."
                    };
                    if (!isInitialLoad) {
                        setError("Could not get a precise location. Please try again in an open area.");
                    }
                    // Trigger the error handler's fallback logic
                    handleLocationError(error, isInitialLoad);
                    return reject(error);
                }

                const newLoc = {
                latitude: lat,
                longitude: lng,
                accuracy: accuracy
                };

                // Set marker position first to ensure it's available for the map
                setUserMarkerPosition({ lat, lng });

                let cityName = await reverseGeocode(lat, lng);
                
                const finalLocation = {
                    ...newLoc,
                    name: cityName ? `${cityName}` : "Current Location",
                };

                setLocation(finalLocation);


                if (mapRef.current && mapRef.current.panTo) {
                    mapRef.current.panTo(
                        new window.google.maps.LatLng(lat, lng)
                    );
                }
                if (!isInitialLoad) {
                    setError(null);
                }
                resolve(finalLocation);
            },
            (err) => {
                handleLocationError(err, isInitialLoad); // Use a shared error handler
                reject(err);
            },
            options
        );
    });

    // NEW: Centralized error handler for geolocation
    const handleLocationError = (err, isInitialLoad) => {
        let errorMessage = "Unable to retrieve your location. ";
        let errorCode = "";
        
        switch(err.code) {
            case 1: // PERMISSION_DENIED
                errorCode = "PERMISSION_DENIED";
                errorMessage += "❌ Check your browser location settings and allow access.";
                break;
            case 2: // POSITION_UNAVAILABLE
                errorCode = "POSITION_UNAVAILABLE";
                errorMessage += "GPS unavailable. Ensure location services are enabled on your device.";
                break;
            case 3: // TIMEOUT
                errorCode = "TIMEOUT";
                errorMessage += "GPS request timed out. Try again.";
                break;
            case 4: // CUSTOM: POOR_ACCURACY
                errorCode = "POOR_ACCURACY";
                errorMessage = "Could not get a precise location. Using default.";
                break;
            default:
                errorCode = "UNKNOWN_ERROR";
                errorMessage += "An unknown error occurred.";
        }
        
        console.error(`❌ Geolocation Error [${errorCode}]:`, err.message);
        
        if (!isInitialLoad) {
            setError(errorMessage);
        }

        // Fallback to default location only if it's the initial load and no location is set yet
        if (isInitialLoad && !location) {
            // REMOVED: No longer falling back to a default location.
            // The error state will be shown instead.
            setError(errorMessage); // Ensure error is set for initial load failure
        }
    };

    const formatDateTime = (dateTimeStr) => {
        const date = new Date(dateTimeStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // --- Render AQI Gauge ---
    const renderAqiGauge = () => {
        if (!currentData || !currentData.indexes || !currentData.indexes.length) {
            return <div className="loading-placeholder">Loading AQI data...</div>;
        }

        let aqi = null;
        let gaugeTitle = '';

        // Default to national AQI
        aqi = currentData.indexes.find(idx => idx.code === 'ind_cpcb');
        gaugeTitle = 'NAQI (India)';

        if (!aqi) {
            // Fallback to universal if national is not available
            aqi = currentData.indexes.find(idx => idx.code === 'uaqi');
            gaugeTitle = 'Universal AQI';
        }

        if (!aqi) {
            return <div className="loading-placeholder">{gaugeTitle} data not available</div>;
        }

        let color;
        if (aqi.color && aqi.color.red !== undefined) {
            // The API provides color components as fractions of 1.0, but some are integers.
            // We need to handle both cases.
            const red = aqi.color.red > 1 ? aqi.color.red : Math.round(aqi.color.red * 255);
            const green = aqi.color.green > 1 ? aqi.color.green : Math.round(aqi.color.green * 255);
            const blue = aqi.color.blue > 1 ? aqi.color.blue : Math.round(aqi.color.blue * 255);
            color = `rgb(${red}, ${green}, ${blue})`;
        } else {
            // Fallback color if the API doesn't provide one
            color = "#FFC107"; // A neutral yellow
        }

        return (
            <AqiGauge
                title={gaugeTitle}
                value={aqi.aqi}
                category={aqi.category}
                color={color}
                dominantPollutant={aqi.dominantPollutant}
            />
        );
    };

    // --- Current Health Recommendations ---
    const renderHealth = () => {
        if (!currentData || !currentData.healthRecommendations) {
            return <div className="loading-placeholder">Loading health recommendations...</div>;
        }
        
        return (
            <HealthRecommendations recommendations={currentData.healthRecommendations} />
        );
    };

    const panelOpen = !collapsed;

    // Handles regular map clicks to update the side panel
    const handleMapLocationUpdate = useCallback(async (lat, lng) => {
        let city = await reverseGeocode(lat, lng);
        const newLocationName = city || 'Selected Location';
        setLocation({
            latitude: lat,
            longitude: lng,
            name: newLocationName
        });
    }, [reverseGeocode]);

    // NEW: Dedicated handler for when "Confirm Location" is clicked on the map
    const handleConfirmLocation = useCallback(async (lat, lng) => {
        let city = await reverseGeocode(lat, lng);
        const newLocationName = city || 'Selected Location';
        const newLocation = { name: newLocationName, lat, lng };

        // If we are updating the primary user location
        if (locationToUpdate === 'primary') {
             setUser(prevUser => ({
                ...prevUser,
                location: newLocationName, // Assuming primary location is just a name
            }));
        } else if (locationToUpdate !== null) {
            // Update existing favorite location
            setUser(prevUser => ({
                ...prevUser,
                savedLocations: prevUser.savedLocations.map((loc, index) => 
                    index === locationToUpdate ? { ...loc, ...newLocation } : loc
                )
            }));
        } else {
            // Add new favorite location
            // Prompt for a name before adding
            const customName = prompt("Enter a name for this location:", newLocationName);
            if (customName) { // Only add if the user provides a name
                newLocation.name = customName;
                setUser(prevUser => ({
                    ...prevUser,
                    savedLocations: [...prevUser.savedLocations, newLocation]
                }));
            }
        }

        // Reset state and re-open modal
        setIsSelectingLocation(false);
        setLocationToUpdate(null);
        setShowProfileModal(true);
    }, [reverseGeocode, locationToUpdate]);

    const handleLogout = () => {
        // Clear token and user data from localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        setIsLoggedIn(false);
        setShowProfileModal(false);
    };

    const cancelSelectOnMap = () => {
        setIsSelectingLocation(false);
        setLocationToUpdate(null);
        setShowProfileModal(true); // Go back to the profile modal
    };

    const handleProfileClick = () => {
        if (isLoggedIn) {
            setShowProfileModal(true);
        } else {
            setLoginPrompt('Log in to view your profile.');
            setShowLoginModal(true);
        }
    };

    const handleAiRecsClick = () => {
        // Always open the HealthRecsModal. The modal itself will handle the logic.
        setShowHealthRecsModal(true);
    };

    const handleEmergencyClick = () => {
        setShowEmergencyModal(true);
    };

    const handleLoginSuccess = (loginData) => {
        const { token, user: loggedInUser } = loginData;
        
        // Store token and user data in localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(loggedInUser));

        setUser(prevUser => ({...prevUser, ...loggedInUser})); // Merge logged-in user data
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setShowSignupModal(false);
        setShowProfileModal(true);
    };

    const handleSelectOnMap = (indexToUpdate = null) => {
        setShowProfileModal(false);
        setIsSelectingLocation(true);
        setLocationToUpdate(indexToUpdate); // null for new, index for update, 'primary' for primary
    };

    const handleViewLocationOnMap = (loc) => {
        if (mapRef.current) {
            mapRef.current.panToAndShowInfo(loc);
            setShowProfileModal(false);
        }
    };

    const handleDeleteLocation = (indexToDelete) => {
        if (window.confirm('Are you sure you want to delete this saved location?')) {
            setUser(prevUser => ({
                ...prevUser,
                savedLocations: prevUser.savedLocations.filter((_, index) => index !== indexToDelete)
            }));
        }
    };

    const handleSearchLocationForProfile = (type) => {
        setShowProfileModal(false);
        setLocationToUpdate(type); // 'add' or 'primary'
        // We don't need to set isSelectingLocation, just focus the search bar
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    const handleGetCurrentLocationForProfile = async () => {
        try {
            const currentLoc = await handleLocate(); // Use existing locate function
            if (currentLoc && currentLoc.latitude && currentLoc.longitude) {
                const locationName = await reverseGeocode(currentLoc.latitude, currentLoc.longitude);
                const newPrimaryLocation = {
                    name: locationName || "Current Location",
                    latitude: currentLoc.latitude,
                    longitude: currentLoc.longitude,
                };
                setUser(prevUser => ({ ...prevUser, primaryLocation: newPrimaryLocation }));
            }
        } catch (error) {
            console.error("Failed to get current location for profile:", error);
            alert("Could not retrieve your current location. Please ensure location services are enabled.");
        }
    };

    return (
        <div className="app-container">
            <div className={`main-content${collapsed ? ' panel-collapsed' : ''}`}>
                {/* --- Side Panel --- */}
                <div className={`info-panel${panelOpen ? '' : ' collapsed'}`}>
                    
                    <div className="info-content">
                        {/* Fixed search section */}
                        <div className="search-section">
                            <form className="search-bar" onSubmit={handleSearch} autoComplete="off">
                                <SearchIcon className="search-icon" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search location..."
                                    value={searchValue}
                                    onChange={e => setSearchValue(e.target.value)}
                                    className="search-input"
                                    disabled={!isMapReady}
                                />
                                <button
                                    type="button"
                                    className="locate-btn"
                                    onClick={() => handleLocate()}
                                    tabIndex={-1}
                                    aria-label="Locate me"
                                    disabled={!isMapReady}
                                >
                                    <MyLocationIcon />
                                </button>
                            </form>
                            
                            {/* Autocomplete dropdown */}
                            {predictions.length > 0 && (
                                <div className="autocomplete-dropdown">
                                    {isSearching && <div className="autocomplete-item">Searching...</div>}
                                    {!isSearching && predictions.map(({ placePrediction }) => (
                                        <div
                                            key={placePrediction.placeId}
                                            className="autocomplete-item"
                                            onClick={() => handleSelectPrediction(placePrediction.placeId, placePrediction.text.text)}
                                        >
                                            {placePrediction.text.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Scrollable content area */}
                        <div className="scrollable-content">
                            {isLoading && (
                                <div className="loading-container">
                                    <div className="loading-spinner" />
                                    <p>{statusMessage}</p>
                                </div>
                            )}

                            {error && !isLoading && (
                                <div className="error-container">
                                    <p className="error-message">{error}</p>
                                    <button className="retry-button" onClick={() => handleLocate(true)}>Try Again</button>
                                </div>
                            )}

                            {!isLoading && !error && location && (
                                <>
                                    <div className="aqi-header">
                                        <div className="location-display">
                                            <h1 className="aqi-place">{location.name}</h1>
                                            {location.latitude && location.longitude && (
                                                <p className="aqi-coords">
                                                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Render AQI Gauge */}
                                    {renderAqiGauge()}

                                    {/* Heatmap Toggle */}
                                    <HeatmapToggle
                                        checked={showHeatmap}
                                        onChange={() => setShowHeatmap((prev) => !prev)}
                                    />

                                    {/* Pollutants List */}
                                    {currentData && currentData.pollutants && (
                                        <Pollutants 
                                            pollutants={currentData.pollutants} 
                                            onSelect={setSelectedPollutant} 
                                        />
                                    )}
                                    
                                    {/* Health Recommendations */}
                                    {renderHealth()}
                                    
                                    {/* Historical Data Chart */}
                                    {historyData ? (
                                        <AqiHistoryChart 
                                            data={historyData} 
                                            onExpand={() => setChartModalData({ type: 'history', data: historyData })} 
                                        />
                                    ) : (
                                        <div className="chart-container">
                                            <p className="loading-placeholder">Historical data not available</p>
                                        </div>
                                    )}
                                    
                                    {/* Forecast Data Chart */}
                                    {forecastData ? (
                                        <AqiForecastChart 
                                            data={forecastData} 
                                            onExpand={() => setChartModalData({ type: 'forecast', data: forecastData })} 
                                        />
                                    ) : (
                                        <div className="chart-container">
                                            <p className="loading-placeholder">Forecast data not available</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                </div>

                {/* --- Map Container --- */}
                <div className="map-container">
                    {/* Loading overlay */}
                    {!isMapReady && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: 'rgba(245,245,245,0.95)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                                transition: 'opacity 0.5s',
                            }}
                        >
                            <div>
                                <div className="loading-spinner" />
                                <div style={{ marginTop: 16, color: '#2563eb', fontWeight: 600, fontSize: 18 }}>
                                    Loading Map...
                                </div>
                            </div>
                        </div>
                    )}
                    {isMapReady && location && (
                        <MapComponent
                            ref={mapRef}
                            showHeatmap={showHeatmap}
                            initialLocation={location}
                            onLocationUpdate={handleMapLocationUpdate}
                            onLocationConfirm={handleConfirmLocation} // Pass the new handler
                            userLocation={userMarkerPosition}
                            isSelecting={isSelectingLocation} // Pass selection state to map
                        />
                    )}
                    {isSelectingLocation && (
                        <div className="map-overlay-message">
                    <p>Click on the map to select a location.</p>
                    <button onClick={cancelSelectOnMap}>Cancel</button>
                </div>
                    )}
                </div>

                {/* --- Floating Action Buttons --- */}
                {/* Emergency Button */}
                <button
                    className={`emergency-btn${collapsed ? ' open' : ''}`}
                    onClick={handleEmergencyClick}
                    aria-label="Emergency information"
                >
                    <SosIcon />
                </button>

                {/* AI Health Recommendations Button */}
                <button
                    className={`health-recs-btn${collapsed ? ' open' : ''}`}
                    onClick={handleAiRecsClick}
                    aria-label="Open AI health recommendations"
                >
                    <MedicalServicesIcon />
                </button>

                {/* Profile Button */}
                <button 
                    className={`profile-btn${collapsed ? ' open' : ''}`} 
                    onClick={handleProfileClick}
                    aria-label="Open profile"
                >
                    <PersonIcon />
                </button>

                {/* Panel Toggle Button */}
                <button 
                    className={`panel-toggle-btn${collapsed ? ' open' : ''}`} 
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? "Open panel" : "Collapse panel"}
                >
                    {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </button>
            </div>
            
            {/* Pollutant Details Modal */}
            {selectedPollutant && (
                <PollutantModal 
                    pollutant={selectedPollutant} 
                    onClose={() => setSelectedPollutant(null)} 
                />
            )}
            
            {/* Chart Modal */}
            {chartModalData && (
                <ChartModal 
                    chartType={chartModalData.type} 
                    data={chartModalData.data} 
                    onClose={() => setChartModalData(null)} 
                />
            )}

            {/* Emergency Modal */}
            {showEmergencyModal && (
                <EmergencyModal onClose={() => setShowEmergencyModal(false)} location={location} />
            )}

            {/* AI Health Recommendations Modal */}
            {showHealthRecsModal && (
                <HealthRecsModal
                    onClose={() => setShowHealthRecsModal(false)}
                    airQualityData={currentData}
                    isLoggedIn={isLoggedIn}
                    onLoginRequest={() => {
                        setShowHealthRecsModal(false);
                        setShowLoginModal(true);
                    }}
                    onSignupRequest={() => {
                        setShowHealthRecsModal(false);
                        setShowSignupModal(true);
                    }}
                />
            )}
            
            {isLoggedIn && showProfileModal && (
                <ProfileModal 
                    user={user} 
                    setUser={setUser}
                    onClose={() => setShowProfileModal(false)}
                    onLogout={handleLogout}
                    onSelectOnMap={handleSelectOnMap}
                    onSearchForLocation={handleSearchLocationForProfile}
                    onViewLocation={handleViewLocationOnMap}
                    onDeleteLocation={handleDeleteLocation}
                />
            )}

            {/* Login Modal */}
            {showLoginModal && !isLoggedIn && (
                <LoginModal 
                    onClose={() => {
                        setShowLoginModal(false);
                        setLoginPrompt(''); 
                    }} 
                    onLoginSuccess={handleLoginSuccess}
                    onSwitchToSignup={() => {
                        setShowLoginModal(false);
                        setShowSignupModal(true);
                    }}
                    prompt={loginPrompt}
                />
            )}

            {/* Signup Modal */}
            {showSignupModal && !isLoggedIn && (
                <SignupModal
                    onClose={() => setShowSignupModal(false)}
                    onSwitchToLogin={() => {
                        setShowSignupModal(false);
                        setShowLoginModal(true);
                    }}
                />
            )}
        </div>
    );
}
