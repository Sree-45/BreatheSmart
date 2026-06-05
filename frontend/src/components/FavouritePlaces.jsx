import React from 'react';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import '../styles/SavedPlaces.css';

const formatCoords = (loc) => {
  if (loc.address) return loc.address;
  const lat = loc.latitude ?? loc.lat;
  const lng = loc.longitude ?? loc.lng;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
  return 'Coordinates unavailable';
};

/**
 * The user's favourite places (gmaps-style). Backed by user.savedLocations.
 * Add via map or search, then view / edit / remove.
 */
const FavouritePlaces = ({ user, onAdd, onSearch, onView, onEdit, onDelete }) => {
  const places = user?.savedLocations || [];

  return (
    <div className="saved-places-container">
      <div className="saved-places-actions">
        <button className="saved-places-btn" onClick={() => onAdd('add')}>
          <AddLocationAltIcon /> Add from Map
        </button>
        <button className="saved-places-btn" onClick={() => onSearch('add')}>
          <SearchIcon /> Add by Search
        </button>
      </div>

      <div className="saved-places-list">
        {places.length > 0 ? (
          places.map((loc, index) => (
            <div key={`${loc.name}-${index}`} className="saved-place-item">
              <div className="saved-place-info">
                <span className="saved-place-name">
                  <StarIcon className="favourite-star" fontSize="inherit" /> {loc.name}
                </span>
                <span className="saved-place-address">{formatCoords(loc)}</span>
              </div>
              <div className="saved-place-actions">
                <button className="action-icon-btn" title="View on Map" onClick={() => onView(loc)}>
                  <VisibilityIcon />
                </button>
                <button className="action-icon-btn" title="Edit location" onClick={() => onEdit(index)}>
                  <EditIcon />
                </button>
                <button className="action-icon-btn" title="Remove favourite" onClick={() => onDelete(index)}>
                  <DeleteIcon />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <StarBorderIcon style={{ fontSize: 40, opacity: 0.4 }} />
            <p>No favourite places yet. Add one from the map or by searching.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavouritePlaces;
