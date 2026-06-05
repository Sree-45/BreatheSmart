import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import '../styles/Home.css';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import HealthRecommendations from '../components/HealthRecommendations';
import {
    fetchCurrentConditions,
    fetchHistoricalData,
    fetchForecastData,
    GOOGLE_MAPS_API_KEY
} from '../services/airQualityService';
import AqiGauge from '../components/AqiGauge';
import Pollutants from '../components/Pollutants';
import AqiHistoryChart from '../components/AqiHistoryChart';
import AqiForecastChart from '../components/AqiForecastChart';
import HeatmapToggle from '../components/HeatmapToggle';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal'; 
import ProfileModal from '../components/ProfileModal';
import HealthRecsModal from '../components/HealthRecsModal';
import PollutantModal from '../components/PollutantModal';
import ChartModal from '../components/ChartModal';
import EmergencyModal from '../components/EmergencyModal';
import SettingsModal from '../components/SettingsModal';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import SosIcon from '@mui/icons-material/Sos';
import MapIcon from '@mui/icons-material/Map';
import DashboardIcon from '@mui/icons-material/Dashboard';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete';
import {
    setPrimaryLocation,
    addSavedLocation,
    updateSavedLocation,
    removeSavedLocation,
    hasSavedLocationNamed,
} from '../utils/locations';

export default function Home() {
    const FALLBACK_LOCATION = {
        latitude: 17.385044,
        longitude: 78.486671,
        name: 'Hyderabad, India'
    };

    const mapRef = useRef(null);
    const searchInputRef = useRef(null); // Ref for the search input
    const [isMapReady, setIsMapReady] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Loading Map...');
    // On mobile start on the MAP (collapsed) so the map is the first thing seen;
    // desktop keeps the panel open.
    const [collapsed, setCollapsed] = useState(
        () => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 860px)')?.matches,
    );
    // Places autocomplete (query, predictions, debounce) lives in its own hook.
    const {
        searchValue, setSearchValue,
        predictions, setPredictions,
        isSearching, justSelectedPrediction,
    } = usePlacesAutocomplete(mapRef);
    const [showHeatmap, setShowHeatmap] = useState(true);
    
    // Data states initialized as null or empty
    const [currentData, setCurrentData] = useState(null);
    const [historyData, setHistoryData] = useState(null);
    const [forecastData, setForecastData] = useState(null);

    const navigate = useNavigate();

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
    // Controlled ProfileModal tab so it survives the close/reopen cycle during
    // map- or search-based location selection (lands back on the right tab).
    const [profileTab, setProfileTab] = useState('profile');
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false); // State for SignupModal
    const [showHealthRecsModal, setShowHealthRecsModal] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isSelectingLocation, setIsSelectingLocation] = useState(false);
    const [locationToUpdate, setLocationToUpdate] = useState(null); // To track which location is being updated
    const [loginPrompt, setLoginPrompt] = useState(''); // For prompting login for features

    // Auth/user state, localStorage hydration, and persistence live in useAuth.
    const { user, setUser, isLoggedIn, persistUser, login, logout } = useAuth();
    const { theme } = useTheme();

    // Load Google Maps API and attempt initial location fetch
    useEffect(() => {
        const initialize = async () => {
            // First, try to get the user's location.
            try {
                await handleLocate(true);
            } catch {
                console.warn("Initial geolocation failed. Falling back to a default location.");
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
        }, async (place, status) => {
            if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
                setError(`Could not get details for location: ${placeText}`);
                return;
            }

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const baseName = place.name || placeText;

            // If the search was launched from the profile ("Set from Search" /
            // "Add by Search"), persist the chosen place instead of just navigating.
            if (user && (locationToUpdate === 'primary' || locationToUpdate === 'add')) {
                const finish = () => {
                    setLocationToUpdate(null);
                    setIsSelectingLocation(false);
                    setSearchValue('');
                    setShowProfileModal(true);
                };

                if (locationToUpdate === 'primary') {
                    await persistUser(setPrimaryLocation(user, {
                        name: baseName, latitude: lat, longitude: lng, address: baseName,
                    }));
                    finish();
                    return;
                }

                const customName = window.prompt('Enter a name for this location:', baseName);
                if (!customName) { finish(); return; }
                if (hasSavedLocationNamed(user, customName)) {
                    alert(`A saved place named "${customName}" already exists.`);
                    finish();
                    return;
                }
                await persistUser(addSavedLocation(user, {
                    name: customName, latitude: lat, longitude: lng, address: baseName,
                }));
                finish();
                return;
            }

            // Normal navigation: update the side panel + pan the map.
            setLocation({ latitude: lat, longitude: lng, name: baseName });
            if (mapRef.current && mapRef.current.panToAndMark) {
                mapRef.current.panToAndMark(place.geometry.location);
            }
        });
    }, [mapRef, user, locationToUpdate, persistUser]);

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

        if (!window.isSecureContext) {
            const error = {
                code: 5,
                message: "Geolocation requires a secure context (HTTPS or localhost)."
            };
            handleLocationError(error, isInitialLoad);
            return reject(error);
        }

        const options = {
            enableHighAccuracy: true,      // ✅ CRITICAL: Request GPS
            timeout: 15000,                // Increased timeout
            maximumAge: 0                  // Always get fresh GPS data
        };

        const requestCurrentPosition = () => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    const accuracy = pos.coords.accuracy;

                    // ✅ Log accuracy to verify GPS precision
                    console.log(`✅ Location Received - Accuracy: ${accuracy.toFixed(1)}m`);
                    console.log(`📍 Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);

                    // Wi-Fi-only laptops can return accuracies in the 5-50km range; a hard
                    // 1km cutoff was rejecting perfectly usable positions. Use a softer
                    // 25km threshold and only warn rather than fall back hard.
                    if (accuracy > 25000) {
                        console.warn(`❌ Very poor accuracy (${accuracy.toFixed(1)}m). Treating as failure.`);
                        const error = {
                            code: 4,
                            message: 'Location accuracy is too low to be useful.',
                        };
                        handleLocationError(error, isInitialLoad);
                        return reject(error);
                    }
                    if (accuracy > 1000) {
                        console.warn(`⚠️ Coarse accuracy (${accuracy.toFixed(1)}m). Continuing anyway.`);
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
        };

        // We deliberately do NOT short-circuit on navigator.permissions.query here:
        // its 'denied' state can lag behind the real site permission (e.g. after
        // re-granting via DevTools) and the prompt itself is sufficient. Just call
        // getCurrentPosition and surface whatever code the OS/browser actually returns.
        requestCurrentPosition();
    });

    // NEW: Centralized error handler for geolocation
    const handleLocationError = (err) => {
        let errorMessage = "Unable to retrieve your location. ";
        let errorCode = "";
        
        switch(err.code) {
            case 1: // PERMISSION_DENIED
                errorCode = "PERMISSION_DENIED";
                errorMessage +=
                    "Location access was denied. If you just allowed it, refresh the page — Chrome's permission cache can lag. " +
                    "Also confirm: browser site settings → Allow location, and Windows Settings → Privacy & security → Location is on for this app.";
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
            case 5: // CUSTOM: INSECURE_CONTEXT
                errorCode = "INSECURE_CONTEXT";
                errorMessage = "Unable to retrieve your location. Geolocation works only on HTTPS or localhost.";
                break;
            default:
                errorCode = "UNKNOWN_ERROR";
                errorMessage += "An unknown error occurred.";
        }
        
        console.error(`❌ Geolocation Error [${errorCode}]:`, err.message);
        
        setError(errorMessage);
        setIsLoading(false);

        // Ensure app remains usable even if geolocation fails.
        if (!location) {
            setLocation(FALLBACK_LOCATION);
        }
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

    // NEW: Dedicated handler for when "Confirm Location" is clicked on the map.
    // Shape of every saved/primary location matches the backend Location.java contract:
    // { name, latitude, longitude, address, dateAdded }
    const handleConfirmLocation = useCallback(async (lat, lng) => {
        if (!user) {
            setIsSelectingLocation(false);
            setLocationToUpdate(null);
            return;
        }
        const city = await reverseGeocode(lat, lng);
        const baseName = city || 'Selected Location';
        const close = () => {
            setIsSelectingLocation(false);
            setLocationToUpdate(null);
            setShowProfileModal(true);
        };

        let nextUser;
        if (locationToUpdate === 'primary') {
            nextUser = setPrimaryLocation(user, { name: baseName, latitude: lat, longitude: lng, address: city || null });
        } else if (typeof locationToUpdate === 'number') {
            // Edit an existing saved location's position (keep its name).
            nextUser = updateSavedLocation(user, locationToUpdate, { latitude: lat, longitude: lng, address: city || null });
        } else {
            // Add a new saved location — prompt for a friendly name first.
            const customName = window.prompt('Enter a name for this location:', baseName);
            if (!customName) { close(); return; }
            if (hasSavedLocationNamed(user, customName)) {
                alert(`A saved place named "${customName}" already exists.`);
                close();
                return;
            }
            nextUser = addSavedLocation(user, { name: customName, latitude: lat, longitude: lng, address: city || null });
        }

        await persistUser(nextUser);
        close();
    }, [reverseGeocode, locationToUpdate, user, persistUser]);

    const handleLogout = () => {
        logout();
        setShowProfileModal(false);
        navigate('/');
    };

    const cancelSelectOnMap = () => {
        setIsSelectingLocation(false);
        setLocationToUpdate(null);
        setShowProfileModal(true); // Go back to the profile modal
    };

    const handleProfileClick = () => {
        if (isLoggedIn && user) {
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
        if (!login(loginData)) return;
        setShowLoginModal(false);
        setShowSignupModal(false);
        setShowProfileModal(true);
    };

    const handleSelectOnMap = (indexToUpdate = null) => {
        setProfileTab(indexToUpdate === 'primary' ? 'profile' : 'favourites');
        setShowProfileModal(false);
        setIsSelectingLocation(true);
        setLocationToUpdate(indexToUpdate); // 'add'/null for new, index for update, 'primary' for primary
    };

    const handleViewLocationOnMap = (loc) => {
        if (!mapRef.current || !loc) return;
        // Backend uses latitude/longitude; the map helper expects {lat, lng}. Adapt here.
        const lat = loc.latitude ?? loc.lat;
        const lng = loc.longitude ?? loc.lng;
        if (lat == null || lng == null) return;
        mapRef.current.panToAndShowInfo({ lat, lng });
        setShowProfileModal(false);
    };

    const handleDeleteLocation = async (indexToDelete) => {
        if (!user || !window.confirm('Are you sure you want to delete this saved location?')) return;
        await persistUser(removeSavedLocation(user, indexToDelete));
    };

    // Favourite (primary) location: view on the map, or clear it.
    const handleViewPrimaryOnMap = () => {
        if (user?.primaryLocation) handleViewLocationOnMap(user.primaryLocation);
    };

    const handleClearPrimary = async () => {
        if (!user || !window.confirm('Remove your favourite (primary) location?')) return;
        await persistUser({ ...user, primaryLocation: null });
    };

    const handleSearchLocationForProfile = (type) => {
        setProfileTab(type === 'primary' ? 'profile' : 'favourites');
        setShowProfileModal(false);
        setLocationToUpdate(type); // 'add' or 'primary'
        // We don't need to set isSelectingLocation, just focus the search bar
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    const handleGetCurrentLocationForProfile = async () => {
        if (!user) return;
        try {
            const currentLoc = await handleLocate();
            if (!currentLoc?.latitude || !currentLoc?.longitude) return;
            const locationName = await reverseGeocode(currentLoc.latitude, currentLoc.longitude);
            await persistUser(setPrimaryLocation(user, {
                name: locationName || 'Current Location',
                latitude: currentLoc.latitude,
                longitude: currentLoc.longitude,
                address: locationName || null,
            }));
        } catch (error) {
            console.error('Failed to get current location for profile:', error);
            alert('Could not retrieve your current location. Please ensure location services are enabled.');
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
                            theme={theme} // Pass current theme so the map can render dark
                        />
                    )}
                    {isSelectingLocation && (
                        <div className="map-overlay-message">
                    <p>Click on the map to select a location.</p>
                    <button onClick={cancelSelectOnMap}>Cancel</button>
                </div>
                    )}

                    {/* Brand badge — the in-page logo, top-left over the map (desktop). */}
                    <div className="map-brand">
                        <span className="map-brand-mark">
                            <img src="/favicon.svg" alt="" width="30" height="30" />
                        </span>
                        <span className="map-brand-name">BreatheSmart</span>
                    </div>

                    {/* Action dock — consolidates the old scattered floating buttons
                        into one clean top-right toolbar (desktop). */}
                    <div className="map-toolbar" role="toolbar" aria-label="Quick actions">
                        <button type="button" onClick={handleAiRecsClick} aria-label="Health recommendations" title="Health recommendations">
                            <MedicalServicesIcon />
                        </button>
                        <button type="button" className="danger" onClick={handleEmergencyClick} aria-label="Emergency information" title="Emergency">
                            <SosIcon />
                        </button>
                        <button type="button" onClick={handleProfileClick} aria-label="Open profile" title="Profile">
                            <PersonIcon />
                        </button>
                        <button type="button" onClick={() => setShowSettings(true)} aria-label="Open settings" title="Settings">
                            <SettingsIcon />
                        </button>
                    </div>
                </div>

                {/* Panel Toggle Button */}
                <button 
                    className={`panel-toggle-btn${collapsed ? ' open' : ''}`} 
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? "Open panel" : "Collapse panel"}
                >
                    {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </button>
            </div>

            {/* Compact brand mark (mobile) — pairs with the floating search. */}
            <div className="mobile-brand" aria-hidden="true">
                <img src="/favicon.svg" alt="BreatheSmart" width="24" height="24" />
            </div>

            {/* Mobile bottom navigation — replaces the floating buttons on small screens */}
            <nav className="mobile-bottom-nav" aria-label="Primary navigation">
                <button
                    className={!collapsed ? 'active' : ''}
                    onClick={() => setCollapsed((c) => !c)}
                    aria-label={collapsed ? 'Show details panel' : 'Show map'}
                >
                    {collapsed ? <DashboardIcon /> : <MapIcon />}
                    <span>{collapsed ? 'Details' : 'Map'}</span>
                </button>
                <button onClick={handleAiRecsClick} aria-label="Health recommendations">
                    <MedicalServicesIcon />
                    <span>Health</span>
                </button>
                <button className="sos" onClick={handleEmergencyClick} aria-label="Emergency">
                    <WarningAmberIcon />
                    <span>SOS</span>
                </button>
                <button onClick={handleProfileClick} aria-label="Profile">
                    <PersonIcon />
                    <span>Profile</span>
                </button>
                <button onClick={() => setShowSettings(true)} aria-label="Settings">
                    <SettingsIcon />
                    <span>Settings</span>
                </button>
            </nav>

            {/* Floating search (mobile) — single search reachable over both the
                map and the details sheet; the panel's own search is hidden on mobile. */}
            <div className="mobile-search">
                <form className="search-bar" onSubmit={handleSearch} autoComplete="off">
                    <SearchIcon className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search location..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
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

            {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

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
                    user={user}
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
            
            {isLoggedIn && showProfileModal && user && (
                <ProfileModal
                    user={user}
                    setUser={setUser}
                    onClose={() => setShowProfileModal(false)}
                    onLogout={handleLogout}
                    onSelectOnMap={handleSelectOnMap}
                    onSearchForLocation={handleSearchLocationForProfile}
                    onViewLocation={handleViewLocationOnMap}
                    onDeleteLocation={handleDeleteLocation}
                    onUseCurrentLocation={handleGetCurrentLocationForProfile}
                    activeTab={profileTab}
                    onTabChange={setProfileTab}
                    onViewPrimary={handleViewPrimaryOnMap}
                    onClearPrimary={handleClearPrimary}
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
