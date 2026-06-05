import { useState, useEffect, useRef, useCallback } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../services/airQualityService';

/**
 * Google Places (New) autocomplete for the location search box.
 *
 * Owns the query text, prediction list, and loading flag, plus a debounced
 * fetch that biases results to the current map view. Selection is left to the
 * caller (it's coupled to the favourites/navigation flow) — it flips
 * `justSelectedPrediction` so the next searchValue change doesn't re-fetch.
 *
 * @param {{current: any}} mapRef - ref to the map (for getBounds location bias).
 */
export function usePlacesAutocomplete(mapRef) {
  const [searchValue, setSearchValue] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const justSelectedPrediction = useRef(false);

  const fetchPredictions = useCallback(async (input) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
        },
        body: JSON.stringify({
          input,
          // Bias results to the current map view when available.
          locationBias: mapRef.current?.getBounds ? { rectangle: mapRef.current.getBounds() } : undefined,
        }),
      });
      if (!response.ok) throw new Error('Autocomplete request failed');
      const data = await response.json();
      setPredictions(data.suggestions || []);
    } catch (error) {
      console.error('Autocomplete error:', error);
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  }, [mapRef]);

  // Debounced fetch on query change; skips the fetch immediately after a selection.
  useEffect(() => {
    if (justSelectedPrediction.current) {
      justSelectedPrediction.current = false;
      return;
    }
    if (!searchValue) {
      setPredictions([]);
      return;
    }
    const handler = setTimeout(() => fetchPredictions(searchValue), 300);
    return () => clearTimeout(handler);
  }, [searchValue, fetchPredictions]);

  return { searchValue, setSearchValue, predictions, setPredictions, isSearching, justSelectedPrediction };
}
