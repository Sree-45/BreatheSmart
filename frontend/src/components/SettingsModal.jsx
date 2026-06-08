import React from 'react';
import '../styles/SettingsModal.css';
import CloseIcon from '@mui/icons-material/Close';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IosShareIcon from '@mui/icons-material/IosShare';
import { useTheme } from '../hooks/useTheme';
import { useFontScale, useReduceMotion, FONT_SCALE_OPTIONS } from '../hooks/useSettings';
import { usePwaInstall } from '../hooks/usePwaInstall';

export default function SettingsModal({ onClose }) {
  const { theme, setTheme } = useTheme();
  const { fontScale, setFontScale } = useFontScale();
  const { reduceMotion, setReduceMotion } = useReduceMotion();
  const { canInstall, isInstalled, isIos, promptInstall } = usePwaInstall();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Settings</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="modal-body">
          {/* Appearance / theme */}
          <div className="settings-group">
            <span className="settings-label">Appearance</span>
            <div className="settings-segment" role="group" aria-label="Theme">
              <button
                type="button"
                className={`settings-segment-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
              >
                <LightModeIcon fontSize="small" />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`settings-segment-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
              >
                <DarkModeIcon fontSize="small" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Font size */}
          <div className="settings-group">
            <span className="settings-label">Font size</span>
            <div className="settings-segment settings-segment-fonts" role="group" aria-label="Font size">
              {FONT_SCALE_OPTIONS.map(({ key, label, scale }) => (
                <button
                  key={key}
                  type="button"
                  className={`settings-segment-btn font-size-btn ${fontScale === key ? 'active' : ''}`}
                  onClick={() => setFontScale(key)}
                  aria-pressed={fontScale === key}
                >
                  <span className="font-sample" style={{ fontSize: `${(scale * 1.05).toFixed(2)}rem` }}>A</span>
                  <span className="font-caption">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="settings-group">
            <span className="settings-label">Preferences</span>
            <div className="settings-toggle-row">
              <label htmlFor="reduce-motion-toggle" className="settings-toggle-label">
                Reduce motion
              </label>
              <label className="settings-switch">
                <input
                  id="reduce-motion-toggle"
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                />
                <span className="settings-switch-track" aria-hidden="true" />
              </label>
            </div>
          </div>

          {/* Install as app (PWA — desktop Chrome/Edge + Android Chrome) */}
          <div className="settings-group">
            <span className="settings-label">App</span>
            {isInstalled ? (
              <div className="settings-install-row installed">
                <CheckCircleIcon fontSize="small" />
                <span>Installed — launch BreatheSmart from your home screen or desktop.</span>
              </div>
            ) : isIos ? (
              <p className="settings-install-hint">
                <IosShareIcon fontSize="small" /> On iPhone/iPad, open in Safari, tap{' '}
                <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  className="settings-install-btn"
                  onClick={() => promptInstall()}
                  disabled={!canInstall}
                >
                  <InstallMobileIcon fontSize="small" />
                  <span>Install as app</span>
                </button>
                <p className="settings-install-hint">
                  {canInstall
                    ? 'Adds BreatheSmart to your desktop or Android home screen — opens in its own window, no browser tabs.'
                    : 'Use Chrome or Edge (desktop or Android). If this is greyed out, browse the app for a moment, then reopen Settings.'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
