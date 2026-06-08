import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../services/airQualityService';
import { getMapConfig } from '../services/mapConfigService';

// Well-known Google Maps "dark" styled-map JSON: dark land/water/roads with
// light labels. Applied when the app theme is 'dark'; light theme keeps the
// existing backend-provided mapConfig.mapStyles.
const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
    { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1b' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
    { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
    { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

// Explicit LIGHT styled-map JSON. Using a full style (rather than []) forces a
// light map regardless of the OS colour-scheme, and — crucially — lets the map
// repaint to light when toggling back from dark in the same session (the
// `colorScheme` option can only be set when the map is first created).
const LIGHT_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'on' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d9ead3' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e6ff' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

const MapComponent = forwardRef(({ showHeatmap = true, initialLocation, onLocationUpdate, onLocationConfirm, userLocation, isSelecting, theme }, ref) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const infoWindowRef = useRef(null);
    const airQualityOverlayRef = useRef(null);
    const userMarkerRef = useRef(null);
    const selectionMarkerRef = useRef(null); // New ref for the temporary selection marker
    const searchMarkerRef = useRef(null); // Marker for autocomplete search results
    const [mapConfig, setMapConfig] = useState(null);

    // Keep latest prop values in refs so the ONE-TIME map click listener reads
    // current values without re-registering — re-registering re-ran the whole
    // init effect on every render and re-fetched map/heatmap tiles.
    const isSelectingRef = useRef(isSelecting);
    const onLocationConfirmRef = useRef(onLocationConfirm);
    const onLocationUpdateRef = useRef(onLocationUpdate);
    useEffect(() => { isSelectingRef.current = isSelecting; }, [isSelecting]);
    useEffect(() => { onLocationConfirmRef.current = onLocationConfirm; }, [onLocationConfirm]);
    useEffect(() => { onLocationUpdateRef.current = onLocationUpdate; }, [onLocationUpdate]);

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
                    // Declutter the top-right corner so Google's controls don't collide
                    // with our floating action dock. Keep zoom (bottom-right).
                    mapTypeControl: false,
                    fullscreenControl: false,
                    streetViewControl: false,
                    // Explicit light/dark styles (not colorScheme) so theme toggles
                    // repaint the map both ways within a session.
                    styles: theme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE
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
                    disableAutoPan: true,
                    headerDisabled: true, // we render our own header + close button for full control
                });
                // Wire our custom close button each time the content (re)renders.
                infoWindowRef.current.addListener('domready', () => {
                    const closeBtn = document.getElementById('bs-iw-close');
                    if (closeBtn) closeBtn.onclick = () => infoWindowRef.current?.close();
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
                    if (isSelectingRef.current) {
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
                                    if (onLocationConfirmRef.current) {
                                        // Call the dedicated confirmation handler
                                        onLocationConfirmRef.current(lat, lng);
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
                        <div class="bs-iw">
                            <div class="bs-iw-loc"><span style="display:inline-block;height:12px;width:55%;background:var(--color-bg-subtle);border-radius:4px;"></span></div>
                            <div class="bs-iw-body">
                                <div class="bs-iw-badge" style="background:var(--color-bg-subtle);box-shadow:none;">
                                    <span style="display:inline-block;width:18px;height:18px;border:3px solid rgba(128,128,128,0.25);border-left-color:var(--color-primary-500);border-radius:50%;animation:spin 0.9s linear infinite;"></span>
                                </div>
                                <div class="bs-iw-info">
                                    <div style="height:13px;width:80%;background:var(--color-bg-subtle);border-radius:4px;margin-bottom:7px;"></div>
                                    <div style="height:10px;width:55%;background:var(--color-bg-subtle);border-radius:4px;"></div>
                                </div>
                            </div>
                        </div>
                        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>`;
                    
                    infoWindowRef.current.setContent(placeholderContent);
                    infoWindowRef.current.setPosition(latLng);
                    infoWindowRef.current.open(mapInstanceRef.current);

                    // Update parent component with the clicked location for the side panel
                    // This is for regular clicks, not for saving a location.
                    if (onLocationUpdateRef.current && !isSelectingRef.current) {
                        onLocationUpdateRef.current(lat, lng);
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
                                <div class="bs-iw">
                                    <button class="bs-iw-close" id="bs-iw-close" aria-label="Close">&times;</button>
                                    <div class="bs-iw-loc" id="infowindow-location">Loading location…</div>
                                    <div class="bs-iw-body">
                                        <div class="bs-iw-badge" style="background-color:${aqiColor};">
                                            <span class="bs-iw-aqi">${aqiIndex.aqi}</span>
                                            <span class="bs-iw-label">NAQI</span>
                                        </div>
                                        <div class="bs-iw-info">
                                            <div class="bs-iw-cat">${aqiIndex.category}</div>
                                            <div class="bs-iw-dom">Dominant <strong>${aqiIndex.dominantPollutant.toUpperCase()}</strong></div>
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
                // Bottom-right (above zoom) so it never overlaps the top-right action dock.
                mapInstanceRef.current.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(recenterControlDiv);

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
        // Initialize ONCE when config is ready. Dynamic values (callbacks,
        // isSelecting, locations) are handled via refs + the dedicated effects
        // below, so we intentionally don't re-run — that was reloading the map.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapConfig]);

    // Restyle the (already-initialized) map when the app theme changes. The map
    // is created ONCE above; here we only swap styles via setOptions so we never
    // re-initialize. Dark theme uses DARK_MAP_STYLE; light keeps the backend
    // config's mapStyles.
    useEffect(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setOptions({
                styles: theme === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE
            });
        }
    }, [theme, mapConfig]);

    // Toggle the AQI heatmap by adding/removing the overlay. Removing it (instead
    // of just zeroing opacity) stops Google from fetching heatmap tiles when
    // hidden — that was burning Air Quality API calls on every pan/zoom.
    useEffect(() => {
        const map = mapInstanceRef.current;
        const overlay = airQualityOverlayRef.current;
        if (!map || !overlay) return;
        const overlays = map.overlayMapTypes;
        let index = -1;
        for (let i = 0; i < overlays.getLength(); i += 1) {
            if (overlays.getAt(i) === overlay) { index = i; break; }
        }
        if (showHeatmap && index === -1) overlays.push(overlay);
        else if (!showHeatmap && index !== -1) overlays.removeAt(index);
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
        </div>
    );
});

MapComponent.displayName = "MapComponent";
export default MapComponent;
