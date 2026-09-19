import React from 'react';
import {
  useTheme,
  TRANSIT_OPERATORS,
  DISPLAY_MODES,
  UI_DENSITIES,
} from '../context/ThemeContext';

function ThemeCustomizerModal() {
  const {
    operator,
    displayMode,
    density,
    customizerOpen,
    setOperator,
    setDisplayMode,
    setDensity,
    closeCustomizer,
    resetCustomization,
  } = useTheme();

  if (!customizerOpen) return null;

  const currentOp = TRANSIT_OPERATORS.find((o) => o.id === operator) || TRANSIT_OPERATORS[0];
  const currentMode = DISPLAY_MODES.find((m) => m.id === displayMode) || DISPLAY_MODES[0];

  return (
    <div className="customizer-backdrop" onClick={closeCustomizer}>
      <div className="customizer-panel" onClick={(e) => e.stopPropagation()}>
        {/* En-tête professionnel */}
        <div className="customizer-header">
          <div className="customizer-title-row">
            <div
              className="customizer-icon-wrapper"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-color)',
              }}
            >
              <span className="material-symbols-outlined">directions_bus</span>
            </div>
            <div>
              <h3 className="customizer-title">Charte Réseau & Ergonomie</h3>
              <p className="customizer-subtitle">
                Identité visuelle du transporteur et accessibilité terrain (Norme WCAG 2.1)
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
          {/* Section 1 : Réseau de Transport */}
          <div className="customizer-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="customizer-label">1. Réseau de Transport (Opérateur)</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Livrée officielle</span>
            </div>
            <div className="operator-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
              {TRANSIT_OPERATORS.map((op) => {
                const isActive = op.id === operator;
                return (
                  <button
                    key={op.id}
                    type="button"
                    className={`accent-card${isActive ? ' active' : ''}`}
                    onClick={() => setOperator(op.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '0.8rem 0.95rem',
                      borderRadius: '14px',
                      gap: '0.35rem',
                      textAlign: 'left',
                      borderColor: isActive ? op.hex : 'var(--border-glass)',
                      backgroundColor: isActive ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '26px',
                            height: '26px',
                            borderRadius: '8px',
                            backgroundColor: op.hex,
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.68rem',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {op.shortCode}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-dark)' }}>
                          {op.name}
                        </span>
                      </div>
                      {isActive && (
                        <span
                          className="material-symbols-outlined"
                          style={{ color: op.hex, fontSize: '18px' }}
                        >
                          check_circle
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: op.hex,
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        marginTop: '2px',
                      }}
                    >
                      {op.badge}
                    </span>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.3 }}>
                      {op.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2 : Conditions Lumineuses & Accessibilité */}
          <div className="customizer-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="customizer-label">2. Environnement Lumineux & Ergonomie</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Norme WCAG 2.1 AAA</span>
            </div>
            <div className="mode-selector-row">
              {DISPLAY_MODES.map((mode) => {
                const isActive = mode.id === displayMode;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={`mode-pill${isActive ? ' active' : ''}`}
                    onClick={() => setDisplayMode(mode.id)}
                    style={{ padding: '0.75rem 0.6rem', textAlign: 'center' }}
                  >
                    <span className="material-symbols-outlined mode-icon">{mode.icon}</span>
                    <span className="mode-label" style={{ marginTop: '2px' }}>{mode.name}</span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
                        fontWeight: 600,
                      }}
                    >
                      {mode.standard}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3 : Densité Métier */}
          <div className="customizer-section">
            <label className="customizer-label">3. Densité d'Interface & Cibles Tactiles (Loi de Fitts)</label>
            <div className="radius-selector-row">
              {UI_DENSITIES.map((d) => {
                const isActive = d.id === density;
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`radius-pill${isActive ? ' active' : ''}`}
                    onClick={() => setDensity(d.id)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                      {d.icon}
                    </span>
                    <div>
                      <div className="radius-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {d.name}
                        <span
                          style={{
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            borderRadius: '999px',
                            backgroundColor: isActive ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                            color: '#ffffff',
                          }}
                        >
                          {d.badge}
                        </span>
                      </div>
                      <div className="radius-desc">{d.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4 : Échantillon Métier & Titre de Transport */}
          <div className="customizer-section">
            <label className="customizer-label">Aperçu Réel du Titre de Transport</label>
            <div
              className="customizer-preview-box"
              style={{
                backgroundColor: displayMode === 'sunlight' ? '#ffffff' : 'rgba(0, 0, 0, 0.4)',
                border: '1.5px solid var(--border-glass)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              }}
            >
              <div className="preview-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      backgroundColor: currentOp.hex,
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {currentOp.shortCode}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-dark)' }}>
                    Billet Voyageur Unitaire
                  </span>
                </div>
                <span className="preview-badge" style={{ backgroundColor: 'var(--primary-light)', borderColor: currentOp.hex }}>
                  Valide • Ligne B1
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0.4rem 0' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>OPÉRATEUR RÉSEAU</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{currentOp.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PRIX UNITAIRE</div>
                  <div style={{ fontWeight: 800, color: currentOp.hex, fontSize: '1.05rem' }}>500 FCFA</div>
                </div>
              </div>

              <div className="preview-actions" style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem' }}>
                <button
                  type="button"
                  className="btn-primary preview-btn"
                  style={{
                    backgroundColor: currentOp.hex,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '0.65rem',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>qr_code_scanner</span>
                  Valider à la borne
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
            Réseau par défaut (BRT)
          </button>
          <button
            type="button"
            className="btn-primary customizer-confirm-btn"
            onClick={closeCustomizer}
          >
            Appliquer la charte
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThemeCustomizerModal;

