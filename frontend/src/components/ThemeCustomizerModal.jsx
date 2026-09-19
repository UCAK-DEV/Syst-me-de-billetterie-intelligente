import React from 'react';
import { useTheme, ACCENT_PRESETS, THEME_MODES, RADIUS_PRESETS } from '../context/ThemeContext';

function ThemeCustomizerModal() {
  const {
    theme,
    accentColor,
    borderRadius,
    customizerOpen,
    setTheme,
    setAccentColor,
    setBorderRadius,
    closeCustomizer,
    resetCustomization,
  } = useTheme();

  if (!customizerOpen) return null;

  return (
    <div className="customizer-backdrop" onClick={closeCustomizer}>
      <div className="customizer-panel" onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className="customizer-header">
          <div className="customizer-title-row">
            <span className="material-symbols-outlined customizer-icon">palette</span>
            <div>
              <h3 className="customizer-title">Personnalisation du Design</h3>
              <p className="customizer-subtitle">Adaptez les couleurs, l'ambiance et les formes en temps réel</p>
            </div>
          </div>
          <button
            type="button"
            className="customizer-close-btn"
            onClick={closeCustomizer}
            aria-label="Fermer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Corps avec les réglages */}
        <div className="customizer-body">
          {/* Section 1 : Nuancier de Couleurs */}
          <div className="customizer-section">
            <label className="customizer-label">
              Couleur d'accentuation principale
            </label>
            <div className="accent-grid">
              {ACCENT_PRESETS.map((preset) => {
                const isActive = preset.id === accentColor;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`accent-card${isActive ? ' active' : ''}`}
                    onClick={() => setAccentColor(preset.id)}
                    title={preset.description}
                  >
                    <span
                      className="accent-circle"
                      style={{
                        backgroundColor: preset.hex,
                        boxShadow: isActive ? `0 0 14px ${preset.hex}` : 'none',
                      }}
                    >
                      {isActive && (
                        <span className="material-symbols-outlined check-icon">check</span>
                      )}
                    </span>
                    <span className="accent-name">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2 : Ambiance & Thème */}
          <div className="customizer-section">
            <label className="customizer-label">Mode d'ambiance</label>
            <div className="mode-selector-row">
              {THEME_MODES.map((mode) => {
                const isActive = mode.id === theme;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={`mode-pill${isActive ? ' active' : ''}`}
                    onClick={() => setTheme(mode.id)}
                  >
                    <span className="material-symbols-outlined mode-icon">{mode.icon}</span>
                    <span className="mode-label">{mode.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3 : Style des Arrondis */}
          <div className="customizer-section">
            <label className="customizer-label">Style des formes</label>
            <div className="radius-selector-row">
              {RADIUS_PRESETS.map((rad) => {
                const isActive = rad.id === borderRadius;
                return (
                  <button
                    key={rad.id}
                    type="button"
                    className={`radius-pill${isActive ? ' active' : ''}`}
                    onClick={() => setBorderRadius(rad.id)}
                  >
                    <span className="material-symbols-outlined">rounded_corner</span>
                    <div>
                      <div className="radius-name">{rad.name}</div>
                      <div className="radius-desc">{rad.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4 : Aperçu interactif en direct */}
          <div className="customizer-section">
            <label className="customizer-label">Aperçu direct des composants</label>
            <div className="customizer-preview-box">
              <div className="preview-top">
                <span className="preview-badge">Titre Actif</span>
                <span className="preview-laser-dot"></span>
              </div>
              <p className="preview-text">
                Les boutons, bordures, lasers de scan et navigation adoptent cette nuance.
              </p>
              <div className="preview-actions">
                <button type="button" className="btn-primary preview-btn">
                  <span className="material-symbols-outlined btn-icon">qr_code_scanner</span>
                  Bouton Principal
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pied de panneau */}
        <div className="customizer-footer">
          <button
            type="button"
            className="btn-secondary customizer-reset-btn"
            onClick={resetCustomization}
          >
            <span className="material-symbols-outlined btn-icon">restart_alt</span>
            Par défaut
          </button>
          <button
            type="button"
            className="btn-primary customizer-confirm-btn"
            onClick={closeCustomizer}
          >
            Appliquer et Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThemeCustomizerModal;
