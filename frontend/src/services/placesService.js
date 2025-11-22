import { GOOGLE_MAPS_API_KEY } from './airQualityService';

/**
 * Finds nearby hospitals using the Google Places API (New).
 * @param {{latitude: number, longitude: number}} location The user's current location.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of hospital place objects.
 */
export const findNearbyHospitals = async (location) => {
    const { latitude, longitude } = location;
    const requestBody = {
        includedTypes: ["hospital"],
        maxResultCount: 5,
        locationRestriction: {
            circle: {
                center: {
                    latitude: latitude,
                    longitude: longitude,
                },
                radius: 10000.0, // 10km radius
            },
        },
        rankPreference: "DISTANCE", // Rank by distance from the user
    };

    try {
        const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error finding hospitals: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.places || [];
    } catch (error) {
        console.error("Error in findNearbyHospitals:", error);
        throw error; // Re-throw to be caught by the component
    }
};

/**
 * Gets the distance and travel time from an origin to multiple hospitals using the Google Maps JS SDK.
 * @param {{latitude: number, longitude: number}} origin The starting location.
 * @param {Array<Object>} hospitals An array of hospital place objects from the Places API.
 * @returns {Promise<Array<Object>>} A promise that resolves to the array of hospitals, updated with distance and duration.
 */
export const getDistanceMatrix = (origin, hospitals) => {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps || !window.google.maps.DistanceMatrixService) {
            return reject(new Error("Google Maps Distance Matrix Service is not available."));
        }

        const service = new window.google.maps.DistanceMatrixService();
        const originLatLng = new window.google.maps.LatLng(origin.latitude, origin.longitude);
        const destinationPlaceIds = hospitals.map(h => `place_id:${h.id}`);

        service.getDistanceMatrix({
            origins: [originLatLng],
            destinations: destinationPlaceIds,
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC,
        }, (response, status) => {
            if (status === window.google.maps.DistanceMatrixStatus.OK) {
                const results = response.rows[0].elements;
                const updatedHospitals = hospitals.map((hospital, index) => {
                    const result = results[index];
                    if (result.status === "OK") {
                        return {
                            ...hospital,
                            distance: result.distance.text,
                            duration: result.duration.text,
                        };
                    }
                    return hospital; // Return original hospital if a specific route failed
                });
                resolve(updatedHospitals);
            } else {
                console.error(`Error getting distance matrix: ${status}`);
                reject(new Error(`Failed to fetch distance data. Status: ${status}`));
            }
        });
    });
};