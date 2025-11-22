import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { GOOGLE_MAPS_API_KEY, getPreferredAqi } from '../services/airQualityService';
import { getMapConfig, getMapStyles, reverseGeocode } from '../services/mapConfigService';

const MapComponent = forwardRef(({ showHeatmap = true, initialLocation, onLocationUpdate, onLocationConfirm, userLocation, isSelecting }, ref) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const infoWindowRef = useRef(null);
    const airQualityOverlayRef = useRef(null);
    const userMarkerRef = useRef(null);
    const selectionMarkerRef = useRef(null); // New ref for the temporary selection marker
    const searchMarkerRef = useRef(null); // Marker for autocomplete search results
    const [mapInitialized, setMapInitialized] = useState(false);
    const [selectedLatLng, setSelectedLatLng] = useState(null);
    const [mapConfig, setMapConfig] = useState(null);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        panTo: (latLng) => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.panTo(latLng);
                mapInstanceRef.current.setZoom(12); // Zoom in when panning to a new location
            }
        },
        panToAndMark: (latLng) => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.panTo(latLng);
                mapInstanceRef.current.setZoom(15); // Increased zoom level

                // Create or move the search marker
                if (searchMarkerRef.current) {
                    searchMarkerRef.current.setPosition(latLng);
                    searchMarkerRef.current.setMap(mapInstanceRef.current);
                } else {
                    searchMarkerRef.current = new window.google.maps.Marker({
                        position: latLng,
                        map: mapInstanceRef.current,
                        title: 'Searched Location',
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: '#f43f5e', // Red color for visibility
                            fillOpacity: 1,
                            strokeColor: 'white',
                            strokeWeight: 3,
                        },
                        zIndex: 1002, // Above other markers
                        animation: window.google.maps.Animation.DROP,
                    });
                }
                // Also trigger the info window
                window.google.maps.event.trigger(mapInstanceRef.current, 'click', { latLng });
            }
        },
        panToAndShowInfo: (location) => {
            if (mapInstanceRef.current) {
                const latLng = new window.google.maps.LatLng(location.lat, location.lng);
                mapInstanceRef.current.panTo(latLng);
                mapInstanceRef.current.setZoom(12);
                // Trigger the click event handler to show the info window
                window.google.maps.event.trigger(mapInstanceRef.current, 'click', { latLng });
            }
        }
    }));

    useEffect(() => {
        const loadConfig = async () => {
            const config = await getMapConfig();
            setMapConfig(config);
        };
        loadConfig();
    }, []);

    useEffect(() => {
        // More lenient check - allow map to initialize even if config fails
        if (!GOOGLE_MAPS_API_KEY) {
            console.error('Google Maps API key is required');
            return;
        }
        
        // Don't require mapConfig - use defaults
        if (!mapConfig && mapRef.current) {
            // Initialize with safe defaults if config fails
            setMapConfig({
                defaultCenter: { lat: 17.3850, lng: 78.4867 },
                defaultZoom: 10,
                mapStyles: [],
                mapOptions: {
                    gestureHandling: 'cooperative',
                    minZoom: 4,
                    maxZoom: 16,
                    mapTypeId: 'roadmap',
                    zoomControl: true,
                    mapTypeControl: false,
                    scaleControl: true,
                    streetViewControl: false
                }
            });
        }

        // This effect handles map initialization and should only run once.
        if (!mapConfig) {
            return;
        }

        const initializeMap = () => {
            try {
                if (!window.google || !window.google.maps) {
                    console.error('Google Maps API not loaded yet');
                    // Retry after a delay
                    setTimeout(initializeMap, 1000);
                    return;
                }

                // Prevent re-initialization
                if (mapInstanceRef.current) {
                    return;
                }

                // Use backend config
                const defaultLocation = initialLocation || mapConfig.defaultCenter;
                const mapOptions = {
                    center: { lat: defaultLocation.latitude || defaultLocation.lat, lng: defaultLocation.longitude || defaultLocation.lng },
                    zoom: mapConfig.defaultZoom,
                    ...mapConfig.mapOptions,
                    styles: mapConfig.mapStyles
                };

                const mapInstance = new window.google.maps.Map(mapRef.current, mapOptions);
                mapInstanceRef.current = mapInstance;

                // Add recenter control
                const recenterControlDiv = document.createElement('div');
                recenterControlDiv.className = 'custom-map-control';
                recenterControlDiv.innerHTML = `
                    <button style="background-color: white; border: none; box-shadow: 0 2px 6px rgba(0,0,0,0.3); 
                    cursor: pointer; margin: 10px; padding: 8px; border-radius: 2px; outline: none;" title="Recenter map to your location">
                    <img src="https://maps.gstatic.com/mapfiles/api-3/images/spotlight-poi2.png" 
                    style="height: 20px; vertical-align: middle;" alt="Center Map"/>
                    </button>`;
                recenterControlDiv.onclick = () => {
                    if (userLocation) {
                        const userLatLng = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
                        mapInstance.setCenter(userLatLng);
                        mapInstance.setZoom(12);
                    } else if (initialLocation) {
                        mapInstance.setCenter({ lat: initialLocation.latitude, lng: initialLocation.longitude });
                        mapInstance.setZoom(10);
                    }
                };

                // Add air quality overlay for global coverage
                const airQualityOverlay = new window.google.maps.ImageMapType({
                    getTileUrl: function (coord, zoom) {
                        // Use the global AQI heatmap tiles
                        return `https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/${zoom}/${coord.x}/${coord.y}?key=${GOOGLE_MAPS_API_KEY}`;
                    },
                    tileSize: new window.google.maps.Size(256, 256),
                    maxZoom: 16,
                    minZoom: 0,
                    opacity: 0.6,
                    name: 'Air Quality',
                });

                mapInstanceRef.current.overlayMapTypes.push(airQualityOverlay);
                airQualityOverlayRef.current = airQualityOverlay;
                infoWindowRef.current = new window.google.maps.InfoWindow({
                    // Disable the default 'x' close button
                    disableAutoPan: true,
                });

                // --- Helper function to get color from AQI value ---
                const getAqiColor = (aqi) => {
                    const aqiColorStops = [
                        { limit: 50, color: { r: 64, g: 192, b: 87 } },   // Good
                        { limit: 100, color: { r: 255, g: 212, b: 59 } }, // Moderate
                        { limit: 150, color: { r: 240, g: 140, b: 0 } },  // Unhealthy for Sensitive
                        { limit: 200, color: { r: 224, g: 49, b: 49 } },   // Unhealthy
                        { limit: 300, color: { r: 139, g: 26, b: 153 } }, // Very Unhealthy
                        { limit: 500, color: { r: 126, g: 0, b: 35 } }    // Hazardous
                    ];

                    let start = { limit: 0, color: aqiColorStops[0].color };
                    let end = aqiColorStops[0];

                    for (const stop of aqiColorStops) {
                        if (aqi <= stop.limit) {
                            end = stop;
                            break;
                        }
                        start = stop;
                    }

                    const range = end.limit - start.limit;
                    const pos = (range === 0) ? 1 : (aqi - start.limit) / range;

                    const r = Math.round(start.color.r + (end.color.r - start.color.r) * pos);
                    const g = Math.round(start.color.g + (end.color.g - start.color.g) * pos);
                    const b = Math.round(start.color.b + (end.color.b - start.color.b) * pos);

                    return `rgb(${r}, ${g}, ${b})`;
                };

                // Add click listener for AQI data
                mapInstanceRef.current.addListener('click', async (mapsMouseEvent) => {
                    const latLng = mapsMouseEvent.latLng;
                    const lat = latLng.lat();
                    const lng = latLng.lng();

                    // --- NEW: Handle location selection mode ---
                    if (isSelecting) {
                        // Close any open info windows
                        if (infoWindowRef.current) infoWindowRef.current.close();
                        
                        // Create or move the selection marker
                        if (selectionMarkerRef.current) {
                            selectionMarkerRef.current.setPosition(latLng);
                        } else {
                            selectionMarkerRef.current = new window.google.maps.Marker({
                                position: latLng,
                                map: mapInstanceRef.current,
                                title: 'Selected Location',
                                icon: {
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    scale: 10,
                                    fillColor: '#f43f5e', // A distinct color
                                    fillOpacity: 1,
                                    strokeColor: 'white',
                                    strokeWeight: 3,
                                },
                                zIndex: 1001, // Above user marker
                                animation: window.google.maps.Animation.DROP,
                            });
                        }

                        // Show a confirmation info window
                        const confirmationContent = `
                            <div style="font-family: system-ui, sans-serif; padding: 8px;">
                                <p style="margin: 0 0 12px 0; font-weight: 500;">Add this location?</p>
                                <button id="confirm-location-btn" style="background-color: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Confirm Location</button>
                            </div>`;
                        
                        infoWindowRef.current.setContent(confirmationContent);
                        infoWindowRef.current.open(mapInstanceRef.current, selectionMarkerRef.current);

                        // Add a listener to the confirm button once the info window is ready
                        window.google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
                            const confirmBtn = document.getElementById('confirm-location-btn');
                            if (confirmBtn) {
                                confirmBtn.addEventListener('click', () => {
                                    if (onLocationConfirm) {
                                        // Call the dedicated confirmation handler
                                        onLocationConfirm(lat, lng);
                                    }
                                    // Clean up
                                    if (selectionMarkerRef.current) {
                                        selectionMarkerRef.current.setMap(null);
                                        selectionMarkerRef.current = null;
                                    }
                                    infoWindowRef.current.close();
                                });
                            }
                        });
                        return; // Stop further execution for selection mode
                    }
                    // --- END: Handle location selection mode ---


                    if (infoWindowRef.current) {
                        infoWindowRef.current.close();
                    }

                    // --- 1. Show a placeholder info window immediately ---
                    const placeholderContent = `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; padding: 8px; width: 250px;">
                            <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 500; color: #555;">Fetching data...</p>
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <div style="width: 60px; height: 60px; background-color: #e0e7ef; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <div style="width: 24px; height: 24px; border: 3px solid rgba(0,0,0,0.2); border-left-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                </div>
                                <div style="flex: 1;">
                                    <div style="height: 16px; width: 80%; background-color: #e0e7ef; border-radius: 4px; margin-bottom: 8px;"></div>
                                    <div style="height: 12px; width: 60%; background-color: #e0e7ef; border-radius: 4px;"></div>
                                </div>
                            </div>
                        </div>
                        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>`;
                    
                    infoWindowRef.current.setContent(placeholderContent);
                    infoWindowRef.current.setPosition(latLng);
                    infoWindowRef.current.open(mapInstanceRef.current);

                    // Update parent component with the clicked location for the side panel
                    // This is for regular clicks, not for saving a location.
                    if (onLocationUpdate && !isSelecting) {
                        onLocationUpdate(lat, lng);
                    }

                    try {
                        // --- 2. Fetch AQI and Geocode data concurrently ---
                        const aqiPromise = fetch(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_MAPS_API_KEY}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                location: { latitude: lat, longitude: lng },
                                extraComputations: [
                                    "HEALTH_RECOMMENDATIONS", 
                                    "POLLUTANT_CONCENTRATION", 
                                    "DOMINANT_POLLUTANT_CONCENTRATION",
                                    "LOCAL_AQI" // <-- This was missing
                                ]
                            }),
                        }).then(res => res.ok ? res.json() : Promise.reject('Failed to fetch AQI data.'));

                        const geocodePromise = new window.google.maps.Geocoder()
                            .geocode({ location: latLng })
                            .then(res => res.results);

                        // --- 3. Update with AQI data as soon as it arrives ---
                        const aqiData = await aqiPromise;
                        
                        // Find the Indian AQI specifically
                        const aqiIndex = aqiData.indexes?.find(idx => idx.code === 'ind_cpcb');

                        if (aqiIndex) {
                            // Determine color: use API color if available, otherwise calculate it
                            const aqiColor = aqiIndex.color 
                                ? `rgb(${Math.round(aqiIndex.color.red * 255)}, ${Math.round(aqiIndex.color.green * 255)}, ${Math.round(aqiIndex.color.blue * 255)})`
                                : getAqiColor(aqiIndex.aqi);

                            const aqiContent = `
                                <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 14px; padding: 0; width: 260px; border-radius: 8px;">
                                    <div style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
                                        <p id="infowindow-location" style="margin: 0; font-size: 15px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Loading location...</p>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 16px; padding: 16px;">
                                        <div style="width: 64px; height: 64px; background-color: ${aqiColor}; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; flex-shrink: 0; box-shadow: 0 4px 8px rgba(0,0,0,0.15);">
                                            <span style="font-size: 24px; font-weight: bold; line-height: 1;">${aqiIndex.aqi}</span>
                                            <span style="font-size: 10px; font-weight: 500; margin-top: 2px; opacity: 0.9;">NAQI</span>
                                        </div>
                                        <div style="flex: 1;">
                                            <p style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600; color: #222;">${aqiIndex.category}</p>
                                            <p style="margin: 0; color: #555; font-size: 13px;">Dominant: <strong style="color: #333;">${aqiIndex.dominantPollutant.toUpperCase()}</strong></p>
                                        </div>
                                    </div>
                                </div>`;
                            infoWindowRef.current.setContent(aqiContent);

                            // --- 4. Update location name when geocode data arrives ---
                            const geocodeResults = await geocodePromise;
                            if (geocodeResults && geocodeResults.length > 0) {
                                const comp = geocodeResults[0].address_components;
                                const city = comp.find(c => c.types.includes("locality"))?.long_name ||
                                             comp.find(c => c.types.includes("administrative_area_level_2"))?.long_name ||
                                             comp.find(c => c.types.includes("administrative_area_level_1"))?.long_name ||
                                             "Selected Area";
                                
                                // Use DOM manipulation on the existing InfoWindow content
                                const currentContent = infoWindowRef.current.getContent();
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = currentContent;
                                const locationElement = tempDiv.querySelector('#infowindow-location');
                                if (locationElement) {
                                    locationElement.textContent = city;
                                    infoWindowRef.current.setContent(tempDiv.innerHTML);
                                }
                            }
                        } else {
                            infoWindowRef.current.setContent('<div style="padding: 12px; font-family: system-ui, sans-serif;">No Indian AQI (NAQI) data available for this location.</div>');
                        }
                    } catch (error) {
                        console.error('Error fetching data for InfoWindow:', error);
                        infoWindowRef.current.setContent('<div style="padding: 10px; color: #d32f2f;">Could not retrieve AQI data. Please try again.</div>');
                    }
                });

                // Trigger resize after map is fully loaded
                window.google.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
                    window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
                    console.log('Map fully loaded and resized');
                });

                // Add control to the map
                mapInstanceRef.current.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(recenterControlDiv);

                // Set map initialized
                setMapInitialized(true);

                // If user location is already available, show the marker now
                if (userLocation && userLocation.lat && userLocation.lng) {
                    const position = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);
                    if (userMarkerRef.current) {
                        userMarkerRef.current.setPosition(position);
                    } else {
                        userMarkerRef.current = new window.google.maps.Marker({
                            position,
                            map: mapInstance,
                            title: 'Your Location',
                            icon: {
                                path: window.google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: '#4285F4',
                                fillOpacity: 1,
                                strokeColor: 'white',
                                strokeWeight: 2,
                            },
                            zIndex: 1000
                        });
                    }
                    mapInstance.setCenter(position);
                    mapInstance.setZoom(12);
                }

            } catch (error) {
                console.error('Error initializing map:', error);
                // Retry after a delay
                setTimeout(initializeMap, 1000);
            }
        };

        // Start initialization with a small delay
        const timer = setTimeout(initializeMap, 200);
        
        return () => {
            clearTimeout(timer);
        };
    }, [mapConfig, GOOGLE_MAPS_API_KEY, onLocationUpdate, onLocationConfirm, isSelecting, userLocation, initialLocation]);

    // Effect for toggling heatmap visibility
    useEffect(() => {
        if (mapInstanceRef.current && airQualityOverlayRef.current) {
            airQualityOverlayRef.current.setOpacity(showHeatmap ? 0.6 : 0);
        }
    }, [showHeatmap]);

    // Effect to manage the user location marker
    useEffect(() => {
        if (mapInstanceRef.current && userLocation && userLocation.lat && userLocation.lng) {
            const position = new window.google.maps.LatLng(userLocation.lat, userLocation.lng);

            if (userMarkerRef.current) {
                // If marker exists, just update its position
                userMarkerRef.current.setPosition(position);
            } else {
                // Create the marker if it doesn't exist
                userMarkerRef.current = new window.google.maps.Marker({
                    position,
                    map: mapInstanceRef.current,
                    title: 'Your Location',
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: '#4285F4',
                        fillOpacity: 1,
                        strokeColor: 'white',
                        strokeWeight: 2,
                    },
                    zIndex: 1000 // Ensure it's on top
                });
                // Center the map on the user's location only when it's first created
                mapInstanceRef.current.setCenter(position);
                mapInstanceRef.current.setZoom(12);
            }
        }
    }, [userLocation]);

    // Effect to manage the draggable cursor based on isSelecting prop
    useEffect(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setOptions({ draggableCursor: isSelecting ? 'crosshair' : 'grab' });
            // Clean up selection marker when exiting selection mode
            if (!isSelecting && selectionMarkerRef.current) {
                selectionMarkerRef.current.setMap(null);
                selectionMarkerRef.current = null;
                if(infoWindowRef.current) infoWindowRef.current.close();
            }
        }
    }, [isSelecting]);

    // Effect to update map center when initialLocation changes from outside (e.g., search)
    useEffect(() => {
        if (mapInstanceRef.current && initialLocation) {
            const center = new window.google.maps.LatLng(
                initialLocation.latitude,
                initialLocation.longitude
            );
            mapInstanceRef.current.setCenter(center);
        }
    }, [initialLocation]);

    // In the useEffect for map initialization, add click listener for selection
    useEffect(() => {
        if (mapInstanceRef.current) {
            const clickListener = window.google.maps.event.addListener(mapInstanceRef.current, 'click', (event) => {
                if (isSelecting) {
                    const latLng = event.latLng;
                    setSelectedLatLng(latLng);
                    
                    // Update or create selection marker
                    if (selectionMarkerRef.current) {
                        selectionMarkerRef.current.setPosition(latLng);
                    } else {
                        selectionMarkerRef.current = new window.google.maps.Marker({
                            position: latLng,
                            map: mapInstanceRef.current,
                            title: 'Selected Location',
                            icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                            animation: window.google.maps.Animation.DROP
                        });
                    }
                }
            });
            
            return () => {
                window.google.maps.event.removeListener(clickListener);
            };
        }
    }, [isSelecting]);

    return (
        <div>
            <div 
                ref={mapRef} 
                className="map-element"
                style={{ 
                    width: '100%', 
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1
                }}
            />
            {isSelecting && selectedLatLng && (
              <div className="map-selection-bar">
                <span>Selected: {selectedLatLng.lat().toFixed(4)}, {selectedLatLng.lng().toFixed(4)}</span>
                <button onClick={() => { onLocationConfirm(selectedLatLng); setSelectedLatLng(null); }}>Confirm</button>
                <button onClick={() => { setSelectedLatLng(null); if (selectionMarkerRef.current) { selectionMarkerRef.current.setMap(null); selectionMarkerRef.current = null; } }}>Cancel</button>
              </div>
            )}
        </div>
    );
});

MapComponent.displayName = "MapComponent";
export default MapComponent;
