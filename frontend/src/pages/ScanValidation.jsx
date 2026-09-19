import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { scannerValidation } from '../services/apiBilletterie';
import { motifLabel, motifColors } from '../utils/motifsRefus';
import { formatDateFR } from '../utils/dates';

const QR_READER_ID = 'qr-reader-camera';
const HISTORIQUE_STORAGE_KEY = 'scanHistoriqueSession';

const chargerHistoriqueStocke = () => {
  try {
    const raw = localStorage.getItem(HISTORIQUE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Bips sonores synthétisés natifs
function playAudioFeedback(isSuccess) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (isSuccess) {
      // Accord montant agréable (succès)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Deux bips descendants graves (refus)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Continuer sans son si restreint
  }
}

function ScanValidation() {
  // Navigation en 2 étapes style Onboarding / Wizard : 'scanner' ou 'result'
  const [step, setStep] = useState('scanner');

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [historiqueSession, setHistoriqueSession] = useState(chargerHistoriqueStocke);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // La caméra est activée automatiquement par défaut en Étape 1
  const [cameraOpen, setCameraOpen] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  // Tiroirs déportés pour ne pas surcharger l'écran principal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  const html5QrRef = useRef(null);
  const scanningRef = useRef(false);

  // Persistance de l'historique de session
  useEffect(() => {
    try {
      localStorage.setItem(HISTORIQUE_STORAGE_KEY, JSON.stringify(historiqueSession));
    } catch {
      // Ignorer
    }
  }, [historiqueSession]);

  const handleScan = async (codeToScan) => {
    const raw = (codeToScan || code).trim();
    if (!raw) return;

    setLoading(true);

    try {
      const res = await scannerValidation(raw);
      setResultat(res);

      if (soundEnabled) {
        playAudioFeedback(res.autorise);
      }

      // Retour haptique sur smartphone
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(res.autorise ? [40, 60, 40] : [100, 50, 100]);
        } catch {
          // Ignorer si non supporté
        }
      }

      // Ajout à la session locale
      setHistoriqueSession((prev) => [
        {
          id: res.validation?.id || `VAL-${Date.now()}`,
          code: raw,
          autorise: res.autorise,
          motifRefus: res.motifRefus,
          message: res.message,
          heure: res.validation?.heureValidation || new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 19),
      ]);

      // Bascule automatique vers l'Étape 2 (Résultat Plein Format)
      setStep('result');
      setManualModalOpen(false);
    } catch (err) {
      const echec = {
        autorise: false,
        message: err.message || 'Erreur lors du scan',
        motifRefus: 'SERVICE_INDISPONIBLE',
      };
      setResultat(echec);
      if (soundEnabled) playAudioFeedback(false);

      setHistoriqueSession((prev) => [
        {
          id: `VAL-${Date.now()}`,
          code: raw,
          autorise: false,
          motifRefus: 'SERVICE_INDISPONIBLE',
          message: echec.message,
          heure: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 19),
      ]);

      setStep('result');
      setManualModalOpen(false);
    } finally {
      setLoading(false);
      setCode('');
    }
  };

  // Réarmement immédiat pour le voyageur suivant
  const handleNextScan = () => {
    setResultat(null);
    setStep('scanner');
    setCameraOpen(true);
  };

  // Démarrage et arrêt automatique de la caméra en fonction de l'étape
  useEffect(() => {
    if (step !== 'scanner' || !cameraOpen) {
      if (html5QrRef.current) {
        html5QrRef.current
          .stop()
          .then(() => html5QrRef.current?.clear())
          .catch(() => {});
        html5QrRef.current = null;
      }
      return undefined;
    }

    setCameraError(null);
    let cancelled = false;

    // Attente du montage du DOM pour le lecteur
    const timer = setTimeout(() => {
      const el = document.getElementById(QR_READER_ID);
      if (!el || cancelled) return;

      const instance = new Html5Qrcode(QR_READER_ID);
      html5QrRef.current = instance;

      instance
        .start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (scanningRef.current) return;
            scanningRef.current = true;
            handleScan(decodedText).finally(() => {
              setTimeout(() => { scanningRef.current = false; }, 1200);
            });
          },
          () => {} // Ignorer les frames intermédiaires
        )
        .catch((err) => {
          if (cancelled) return;
          console.warn('Caméra indisponible :', err);
          setCameraError("Caméra indisponible ou permission refusée. Vous pouvez utiliser la saisie manuelle.");
          setCameraOpen(false);
        });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (html5QrRef.current) {
        html5QrRef.current
          .stop()
          .then(() => html5QrRef.current?.clear())
          .catch(() => {});
        html5QrRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cameraOpen]);

  const totalSession = historiqueSession.length;
  const autorisesSession = historiqueSession.filter((h) => h.autorise).length;
  const refusesSession = historiqueSession.filter((h) => !h.autorise).length;

  return (
    <main className="main-content scan-onboarding-container">
      {/* Barre d'étape style Onboarding */}
      <div className="scan-wizard-header">
        <div className="scan-steps-badge-row">
          <span className={`scan-step-badge${step === 'scanner' ? ' active' : ' completed'}`}>
            <span className="step-num">1</span>
            <span className="step-text">Scanner le titre</span>
          </span>
          <span className="material-symbols-outlined step-separator">chevron_right</span>
          <span className={`scan-step-badge${step === 'result' ? ' active' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-text">Décision</span>
          </span>
        </div>

        {/* Commandes discrètes d'en-tête */}
        <div className="scan-quick-tools">
          <button
            type="button"
            className={`tool-pill-btn${soundEnabled ? ' active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Désactiver les signaux sonores' : 'Activer les signaux sonores'}
          >
            <span className="material-symbols-outlined">
              {soundEnabled ? 'volume_up' : 'volume_off'}
            </span>
          </button>

          <button
            type="button"
            className="tool-pill-btn session-badge-btn"
            onClick={() => setHistoryDrawerOpen(true)}
            title="Consulter les statistiques de la session"
          >
            <span className="material-symbols-outlined">bar_chart</span>
            <span className="session-count-text">{totalSession} scans</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          ÉTAPE 1 : LE SCANNER CAMÉRA PLEIN FORMAT (PRIORITAIRE & SANS DISTRACTION)
          ========================================================================= */}
      {step === 'scanner' && (
        <section className="scan-step-view scan-step-camera">
          <div className="scan-prompt-header">
            <h1 className="scan-main-title">Contrôle des Titres</h1>
            <p className="scan-main-subtitle">
              Cadrez le QR Code du voyageur dans les repères lumineux
            </p>
          </div>

          {cameraError && (
            <div className="offline-notice" style={{ maxWidth: '420px', margin: '0 auto 1rem' }}>
              <span className="material-symbols-outlined offline-icon">videocam_off</span>
              <div>
                <div className="offline-title">Accès caméra restreint</div>
                <div className="offline-text">{cameraError}</div>
              </div>
            </div>
          )}

          {/* Viseur caméra immersif haute précision */}
          <div className="scan-hero-viewfinder-wrapper">
            <div className="scanner-viewfinder-overlay">
              <div id={QR_READER_ID} className="qr-camera-view" style={{ width: '100%', height: '100%' }} />

              {/* Repères et laser de scan */}
              <div className="scanner-viewfinder-box">
                <span className="scanner-bracket scanner-bracket-tl"></span>
                <span className="scanner-bracket scanner-bracket-tr"></span>
                <span className="scanner-bracket scanner-bracket-bl"></span>
                <span className="scanner-bracket scanner-bracket-br"></span>
                <div className="scanner-laser-line"></div>
              </div>

              {/* Pilule d'état de scan */}
              <div className="scanner-status-pill">
                <span className="pulse-indicator"></span>
                <span>{loading ? 'Validation en cours...' : 'Prêt · Présentez le QR Code'}</span>
              </div>
            </div>
          </div>

          {/* Option de saisie manuelle en bas (Secondaire / Déportée) */}
          <div className="scan-secondary-options">
            <button
              type="button"
              className="scan-manual-trigger-btn"
              onClick={() => setManualModalOpen(true)}
            >
              <span className="material-symbols-outlined">keyboard</span>
              <span>Caméra indisponible ? Saisie manuelle</span>
            </button>
          </div>
        </section>
      )}

      {/* =========================================================================
          ÉTAPE 2 : L'ÉCRAN DE DÉCISION PLEIN FORMAT (INSTANTANÉ, ULTRA-LISIBLE)
          ========================================================================= */}
      {step === 'result' && resultat && (
        <section className="scan-step-view scan-step-decision">
          <div className={`scan-decision-card ${resultat.autorise ? 'autorise' : 'refuse'}`}>
            {/* Grand Icône Décisionnelle Animée */}
            <div className={`decision-icon-circle ${resultat.autorise ? 'autorise' : 'refuse'}`}>
              <span className="material-symbols-outlined">
                {resultat.autorise ? 'check_circle' : 'cancel'}
              </span>
            </div>

            {/* Titre Principal percutant */}
            <h1 className="decision-title">
              {resultat.autorise ? 'VOYAGE AUTORISÉ' : 'VOYAGE REFUSÉ'}
            </h1>

            {/* Motif du refus mis en exergue */}
            {!resultat.autorise && resultat.motifRefus && (
              <div className="decision-reason-box" style={motifColors(resultat.motifRefus)}>
                <span className="material-symbols-outlined reason-icon">error_outline</span>
                <span className="reason-text">{motifLabel(resultat.motifRefus)}</span>
              </div>
            )}

            <p className="decision-message">
              {resultat.message || (resultat.autorise ? 'Titre valide et contrôlé avec succès' : 'Validation non accordée')}
            </p>

            {/* Fiche récapitulative compacte */}
            <div className="decision-meta-card">
              {resultat.titre?.typeTitre && (
                <div className="meta-row">
                  <span className="meta-label">Formule :</span>
                  <span className="meta-val">{resultat.titre.typeTitre.replace('_', ' ')}</span>
                </div>
              )}
              {resultat.abonnement?.voyagesRestants !== undefined && (
                <div className="meta-row">
                  <span className="meta-label">Voyages restants :</span>
                  <span className="meta-val highlight-val">{resultat.abonnement.voyagesRestants}</span>
                </div>
              )}
              {resultat.abonnement?.dateExpiration && (
                <div className="meta-row">
                  <span className="meta-label">Expiration :</span>
                  <span className="meta-val">{formatDateFR(resultat.abonnement.dateExpiration)}</span>
                </div>
              )}
              {resultat.validation?.id && (
                <div className="meta-row">
                  <span className="meta-label">ID Contrôle :</span>
                  <span className="meta-val monospace">{resultat.validation.id.substring(0, 10)}...</span>
                </div>
              )}
            </div>

            {/* Bouton d'action géant pour enchaîner les voyageurs */}
            <div className="decision-actions-row">
              <button
                type="button"
                className="scan-next-action-btn"
                onClick={handleNextScan}
                autoFocus
              >
                <span className="material-symbols-outlined">qr_code_scanner</span>
                <span>Scanner le voyageur suivant</span>
              </button>

              <button
                type="button"
                className="btn-secondary decision-back-btn"
                onClick={() => setHistoryDrawerOpen(true)}
              >
                <span className="material-symbols-outlined">history</span>
                <span>Historique de session</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          TIROIR DÉROULANT : SAISIE MANUELLE AU CLAVIER (FALLBACK DE SECOURS)
          ========================================================================= */}
      {manualModalOpen && (
        <div className="customizer-backdrop" onClick={() => setManualModalOpen(false)}>
          <div className="customizer-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="customizer-header">
              <div className="customizer-title-row">
                <span className="material-symbols-outlined customizer-icon">keyboard</span>
                <div>
                  <h3 className="customizer-title">Saisie manuelle du code</h3>
                  <p className="customizer-subtitle">En cas de QR Code détérioré ou de caméra indisponible</p>
                </div>
              </div>
              <button
                type="button"
                className="customizer-close-btn"
                onClick={() => setManualModalOpen(false)}
                aria-label="Fermer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScan();
              }}
              style={{ padding: '1.5rem' }}
            >
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="manual-code-input">
                  Code unique du titre
                </label>
                <input
                  id="manual-code-input"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: TKT-a94f83bc..."
                  className="form-input"
                  style={{ fontSize: '1rem', padding: '0.85rem' }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setManualModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !code.trim()}
                  style={{ flex: 2 }}
                >
                  {loading ? 'Vérification...' : 'Valider le titre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TIROIR LATÉRAL : HISTORIQUE & STATISTIQUES DE SESSION
          ========================================================================= */}
      {historyDrawerOpen && (
        <div className="customizer-backdrop" onClick={() => setHistoryDrawerOpen(false)}>
          <div className="customizer-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="customizer-header">
              <div className="customizer-title-row">
                <span className="material-symbols-outlined customizer-icon">bar_chart</span>
                <div>
                  <h3 className="customizer-title">Session de contrôle</h3>
                  <p className="customizer-subtitle">Bilan des scans effectués depuis cette borne</p>
                </div>
              </div>
              <button
                type="button"
                className="customizer-close-btn"
                onClick={() => setHistoryDrawerOpen(false)}
                aria-label="Fermer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="customizer-body">
              {/* Mini-statistiques */}
              <div className="scan-stats-row" style={{ marginTop: 0 }}>
                <div className="stats-card scan-stat">
                  <span className="metric-label">Total</span>
                  <span className="metric-value">{totalSession}</span>
                </div>
                <div className="stats-card scan-stat">
                  <span className="metric-label">Autorisés</span>
                  <span className="metric-value status-actif">{autorisesSession}</span>
                </div>
                <div className="stats-card scan-stat">
                  <span className="metric-label">Refusés</span>
                  <span className="metric-value status-supprime">{refusesSession}</span>
                </div>
              </div>

              {/* Liste des derniers scans */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="customizer-label">Derniers passages</span>
                  {historiqueSession.length > 0 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setHistoriqueSession([])}
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                    >
                      Effacer
                    </button>
                  )}
                </div>

                {historiqueSession.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem 0', fontSize: '0.85rem' }}>
                    Aucun contrôle enregistré dans cette session.
                  </p>
                ) : (
                  historiqueSession.map((item, idx) => (
                    <div key={idx} className="history-card-item" style={{ padding: '0.75rem 0.9rem' }}>
                      <div className="history-card-left">
                        <div className={`history-card-icon-box ${item.autorise ? 'autorise' : 'refuse'}`} style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '10px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            {item.autorise ? 'check' : 'close'}
                          </span>
                        </div>
                        <div className="history-card-details">
                          <span className="history-card-title" style={{ fontSize: '0.82rem' }}>{item.code}</span>
                          <span className="history-card-meta">{item.heure}</span>
                        </div>
                      </div>
                      <div className="history-card-right">
                        <span
                          className="role-badge"
                          style={{
                            fontSize: '0.7rem',
                            backgroundColor: item.autorise ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: item.autorise ? '#10b981' : '#ef4444',
                          }}
                        >
                          {item.autorise ? 'Autorisé' : 'Refusé'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="customizer-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setHistoryDrawerOpen(false)}
                style={{ width: '100%' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default ScanValidation;
