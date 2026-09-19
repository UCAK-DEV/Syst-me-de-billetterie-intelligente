import React from 'react';
import {
  useTheme,
  COLOR_PRESETS,
  THEME_MODES,
  RADIUS_PRESETS,
} from '../context/ThemeContext';

function ThemeCustomizerModal() {
  const {
    color,
    theme,
    borderRadius,
    customizerOpen,
    setColor,
    setTheme,
    setBorderRadius,
    closeCustomizer,
    resetCustomization,
  } = useTheme();

  if (!customizerOpen) return null;

  const currentColor = COLOR_PRESETS.find((c) => c.id === color) || COLOR_PRESETS[0];

  return (
    <div className="customizer-backdrop" onClick={closeCustomizer}>
      <div className="customizer-panel" onClick={(e) => e.stopPropagation()}>
        {/* En-tête sobre */}
        <div className="customizer-header">
          <div className="customizer-title-row">
            <span className="material-symbols-outlined customizer-icon">palette</span>
            <div>
              <h3 className="customizer-title">Personnalisation</h3>
              <p className="customizer-subtitle">
                Choisissez votre couleur d'accentuation, l'ambiance et le style des formes
              </p>
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

        {/* Corps des réglages */}
        <div className="customizer-body">
          {/* Section 1 : Nuancier de Pastilles Simples */}
          <div className="customizer-section">
            <label className="customizer-label">Couleur d'accentuation</label>
            <div className="accent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
              {COLOR_PRESETS.map((preset) => {
                const isActive = preset.id === color;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`accent-card${isActive ? ' active' : ''}`}
                    onClick={() => setColor(preset.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.7rem',
                      padding: '0.7rem 0.85rem',
                      borderRadius: '12px',
                      backgroundColor: isActive ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.03)',
                      borderColor: isActive ? preset.hex : 'var(--border-glass)',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      className="accent-circle"
                      style={{
                        width: '26px',
                        height: '26px',
                        minWidth: '26px',
                        borderRadius: '50%',
                        backgroundColor: preset.hex,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isActive ? `0 0 10px ${preset.hex}` : 'none',
                      }}
                    >
                      {isActive && (
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ffffff', fontWeight: 900 }}>
                          check
                        </span>
                      )}
                    </span>
                    <span style={{ fontWeight: 650, fontSize: '0.85rem', color: 'var(--text-dark)' }}>
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2 : Ambiance de fond */}
          <div className="customizer-section">
            <label className="customizer-label">Ambiance</label>
            <div className="mode-selector-row">
              {THEME_MODES.map((m) => {
                const isActive = m.id === theme;
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`mode-pill${isActive ? ' active' : ''}`}
                    onClick={() => setTheme(m.id)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="material-symbols-outlined mode-icon">{m.icon}</span>
                    <span className="mode-label" style={{ marginTop: '2px' }}>{m.name}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3 : Formes */}
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
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                    }}
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

          {/* Section 4 : Aperçu direct */}
          <div className="customizer-section">
            <label className="customizer-label">Aperçu direct</label>
            <div
              className="customizer-preview-box"
              style={{
                borderRadius: 'var(--radius-card, 14px)',
                padding: '1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px dashed var(--border-glass)',
              }}
            >
              <div className="preview-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  className="preview-badge"
                  style={{
                    backgroundColor: 'var(--primary-light)',
                    color: currentColor.hex,
                    border: `1px solid ${currentColor.hex}`,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                >
                  Titre actif • Nuance {currentColor.name}
                </span>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: currentColor.hex,
                    boxShadow: `0 0 8px ${currentColor.hex}`,
                  }}
                />
              </div>

              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn-primary preview-btn"
                  style={{
                    backgroundColor: currentColor.hex,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.6rem 1.1rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                  Bouton Principal
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '0.6rem 1rem' }}
                >
                  Bouton Secondaire
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
            Rétablir par défaut
          </button>
          <button
            type="button"
            className="btn-primary customizer-confirm-btn"
            onClick={closeCustomizer}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThemeCustomizerModal;


