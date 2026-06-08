import React, { useState } from 'react';
import '../styles/LocationPicker.css';
import CloseIcon from '@mui/icons-material/Close';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PlaceIcon from '@mui/icons-material/Place';

/**
 * Swiggy-style location picker. Opens from the sidebar location name and lets
 * you: use current location, jump to a saved/favourite place, search, and
 * (when logged in) set the current place as primary or add it to favourites
 * with an inline label — no browser prompt/alert.
 */
const LocationPicker = ({
    onClose,
    isLoggedIn,
    user,
    currentLocation,
    searchValue,
    setSearchValue,
    predictions,
    isSearching,
    onPickPrediction,
    onUseCurrent,
    onPickSaved,
    onSetPrimary,
    onAddFavourite,
    onLoginRequest,
}) => {
    const [favName, setFavName] = useState('');
    const [adding, setAdding] = useState(false);
    const [note, setNote] = useState('');

    const primary = user?.primaryLocation;
    const saved = user?.savedLocations || [];

    const submitFav = () => {
        const name = favName.trim();
        if (!name) return;
        if ((saved || []).some((l) => l.name?.toLowerCase() === name.toLowerCase())) {
            setNote(`"${name}" already exists in favourites.`);
            return;
        }
        onAddFavourite(name);
        setFavName('');
        setAdding(false);
        setNote('Added to favourites ★');
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content location-picker" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Choose location</h3>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                        <CloseIcon />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="lp-search">
                        <SearchIcon className="lp-search-icon" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search for a city or area…"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </div>

                    {predictions.length > 0 && (
                        <div className="lp-predictions">
                            {isSearching && <div className="lp-pred-item muted">Searching…</div>}
                            {!isSearching && predictions.map(({ placePrediction }) => (
                                <button
                                    key={placePrediction.placeId}
                                    className="lp-pred-item"
                                    onClick={() => { onPickPrediction(placePrediction.placeId, placePrediction.text.text); onClose(); }}
                                >
                                    <PlaceIcon />
                                    <span>{placePrediction.text.text}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <button className="lp-row lp-current" onClick={() => { onUseCurrent(); onClose(); }}>
                        <MyLocationIcon />
                        <span>Use my current location</span>
                    </button>

                    {isLoggedIn ? (
                        <>
                            {(primary || saved.length > 0) && <div className="lp-section-label">Your places</div>}
                            {primary && (
                                <button className="lp-row" onClick={() => { onPickSaved(primary); onClose(); }}>
                                    <StarIcon className="lp-star" />
                                    <span className="lp-row-text"><strong>{primary.name}</strong><small>Primary</small></span>
                                </button>
                            )}
                            {saved.map((loc, i) => (
                                <button key={i} className="lp-row" onClick={() => { onPickSaved(loc); onClose(); }}>
                                    <StarBorderIcon />
                                    <span className="lp-row-text">
                                        <strong>{loc.name}</strong>
                                        {loc.address && <small>{loc.address}</small>}
                                    </span>
                                </button>
                            ))}

                            {currentLocation && (
                                <div className="lp-save">
                                    <div className="lp-section-label">Save “{currentLocation.name}”</div>
                                    <div className="lp-save-actions">
                                        <button className="lp-save-btn" onClick={() => { onSetPrimary(); setNote('Set as primary ★'); }}>
                                            <StarIcon /> Set as primary
                                        </button>
                                        {!adding ? (
                                            <button className="lp-save-btn" onClick={() => { setFavName(currentLocation.name || ''); setAdding(true); setNote(''); }}>
                                                <StarBorderIcon /> Add to favourites
                                            </button>
                                        ) : (
                                            <div className="lp-add-fav">
                                                <input
                                                    type="text"
                                                    placeholder="Label (e.g. Home, Work)"
                                                    value={favName}
                                                    onChange={(e) => setFavName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && submitFav()}
                                                    autoFocus
                                                />
                                                <button onClick={submitFav} disabled={!favName.trim()}>Save</button>
                                            </div>
                                        )}
                                    </div>
                                    {note && <div className="lp-note">{note}</div>}
                                </div>
                            )}
                        </>
                    ) : (
                        <button className="lp-row lp-login" onClick={() => { onLoginRequest(); onClose(); }}>
                            Log in to see saved places &amp; favourites
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LocationPicker;
