import React from 'react';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import '../styles/SavedPlaces.css';

const SavedPlaces = ({
  user,
  onAdd,
  onSearch,
  onView,
  onEdit,
  onDelete,
}) => {
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
        {user.savedLocations && user.savedLocations.length > 0 ? (
          user.savedLocations.map((loc, index) => (
            <div key={index} className="saved-place-item">
              <div className="saved-place-info">
                <span className="saved-place-name">{loc.name}</span>
                <span className="saved-place-address">{loc.address || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}</span>
              </div>
              <div className="saved-place-actions">
                <button className="action-icon-btn" title="View on Map" onClick={() => onView(loc)}>
                  <VisibilityIcon />
                </button>
                <button className="action-icon-btn" title="Edit" onClick={() => onEdit(index)}>
                  <EditIcon />
                </button>
                <button className="action-icon-btn" title="Delete" onClick={() => onDelete(index)}>
                  <DeleteIcon />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>You haven't saved any places yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPlaces;