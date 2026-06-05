/**
 * Pure helpers for a user's location data (primary + saved places).
 *
 * Every saved/primary location follows the backend `Location` contract:
 *   { name, latitude, longitude, address, dateAdded }
 *
 * Centralizing the shape here keeps the map-based and search-based flows in
 * sync — previously each built the object inline, and the search path simply
 * forgot to, which is why "Add by Search" never persisted.
 */

export const makeLocation = ({ name, latitude, longitude, address = null, dateAdded }) => ({
  name,
  latitude,
  longitude,
  address,
  dateAdded: dateAdded || new Date().toISOString(),
});

/** Returns a new user with `primaryLocation` set, preserving its original dateAdded. */
export const setPrimaryLocation = (user, loc) => ({
  ...user,
  primaryLocation: makeLocation({
    ...loc,
    dateAdded: user?.primaryLocation?.dateAdded || loc.dateAdded,
  }),
});

/** Returns a new user with `loc` appended to `savedLocations`. */
export const addSavedLocation = (user, loc) => ({
  ...user,
  savedLocations: [...(user?.savedLocations || []), makeLocation(loc)],
});

/** Returns a new user with the saved location at `index` shallow-merged with `partial`. */
export const updateSavedLocation = (user, index, partial) => ({
  ...user,
  savedLocations: (user?.savedLocations || []).map((loc, i) =>
    i === index ? { ...loc, ...partial } : loc,
  ),
});

/** Returns a new user with the saved location at `index` removed. */
export const removeSavedLocation = (user, index) => ({
  ...user,
  savedLocations: (user?.savedLocations || []).filter((_, i) => i !== index),
});

/** True if a saved location with this name already exists (case-insensitive). */
export const hasSavedLocationNamed = (user, name) =>
  (user?.savedLocations || []).some(
    (loc) => loc.name?.toLowerCase() === name?.toLowerCase(),
  );
