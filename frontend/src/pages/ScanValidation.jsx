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
  const isSecure = typeof window !== 'undefined'
    ? (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    : true;

  // Étapes simples : 'scanner' ou 'result'
  const [step, setStep] = useState('scanner');
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [historiqueSession, setHistoriqueSession] = useState(chargerHistoriqueStocke);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // La caméra arrière ('environment') est la bonne par défaut pour scanner un QR code
  const [cameraOpen, setCameraOpen] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  // Tiroir historique
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

  /**
   * Traitement d'un QR Code décodé :
   * - Envoi du code unique à l'API de validation du Service Billetterie
   * - Émission d'un retour sonore (bip aigu si succès, grave si échec)
   * - Déclenchement de la vibration haptique sur smartphone
   * - Enregistrement dans l'historique de session locale
   * - Affichage de l'écran de décision (Autorisé / Refusé)
   */
  const handleScan = async (codeToScan) => {
    const raw = (codeToScan || '').trim();
    if (!raw) return;

    setLoading(true);

    try {
      // 1. Appel du microservice Billetterie (POST /api/billetterie/validations/scan)
      const res = await scannerValidation(raw);
      setResultat(res);

      // 2. Feedback sonore
      if (soundEnabled) {
        playAudioFeedback(res.autorise);
      }

      // 3. Retour haptique (vibration) sur smartphone compatible
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(res.autorise ? [40, 60, 40] : [100, 50, 100]);
        } catch {
          // Ignorer si non supporté par le matériel
        }
      }

      // 4. Mémorisation du contrôle dans la session courante
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

      // 5. Affichage immédiat du grand écran de résultat
      setStep('result');
    } catch (err) {
      // En cas d'erreur de communication ou indisponibilité du service
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
    } finally {
      setLoading(false);
    }
  };

  /**
   * Réinitialise l'état pour contrôler le voyageur suivant
   */
  const handleNextScan = () => {
    setResultat(null);
    setStep('scanner');
    setCameraError(null);
    setCameraOpen(true);
  };

  /**
   * Bascule entre la caméra frontale ('user') et arrière ('environment')
   */
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setCameraOpen(false);
    setTimeout(() => setCameraOpen(true), 120);
  };

  /**
   * Arrêt sécurisé du flux caméra évitant les blocages ou exceptions non interceptées
   */
  const safeStopScanner = async (instance) => {
    if (!instance) return;
    try {
      if (instance.isScanning) {
        await instance.stop();
      }
    } catch {
      // Ignorer l'exception synchrone ou asynchrone si le scanner n'est pas actif
    }
    try {
      await instance.clear();
    } catch {
      // Ignorer
    }
  };

  // Démarrage intelligent de la caméra (caméra frontale 'user' par défaut absolu, repli automatique)
  useEffect(() => {
    let cancelled = false;

    if (step !== 'scanner' || !cameraOpen) {
      if (html5QrRef.current) {
        const instance = html5QrRef.current;
        html5QrRef.current = null;
        safeStopScanner(instance);
      }
      return undefined;
    }

    setCameraError(null);

    // Détection immédiate du contexte sécurisé (HTTPS / localhost requis pour getUserMedia)
    if (!isSecure) {
      setCameraError(
        "Les navigateurs bloquent la caméra en direct sur une adresse HTTP non chiffrée. Utilisez le lien HTTPS sécurisé officiel ci-dessus ou prenez un cliché photo ci-dessous."
      );
      setCameraOpen(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      const el = document.getElementById(QR_READER_ID);
      if (!el || cancelled) return;

      if (html5QrRef.current) {
        const prev = html5QrRef.current;
        html5QrRef.current = null;
        await safeStopScanner(prev);
      }
      if (cancelled) return;

      const instance = new Html5Qrcode(QR_READER_ID);
      html5QrRef.current = instance;

      const onScanSuccess = (decodedText) => {
        if (scanningRef.current) return;
        scanningRef.current = true;
        handleScan(decodedText).finally(() => {
          setTimeout(() => { scanningRef.current = false; }, 1200);
        });
      };

      try {
        // 1. Découverte matérielle des caméras (pour repli si nécessaire)
        let deviceList = [];
        try {
          if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
            deviceList = await Html5Qrcode.getCameras();
          }
        } catch {
          // Ignorer si l'énumération n'est pas permise
        }

        if (cancelled) {
          await safeStopScanner(instance);
          return;
        }

        // 2. Choix de la configuration : Priorité absolue à la contrainte native facingMode ('user' par défaut)
        // L'API native du navigateur sélectionne directement la caméra frontale / selfie
        const configToTry = { facingMode: facingMode };

        // 3. Démarrage de la caméra : SANS qrbox pour éliminer le rectangle ombré et les doubles cadres
        try {
          await instance.start(
            configToTry,
            { fps: 10 },
            onScanSuccess,
            () => {}
          );
        } catch (firstErr) {
          if (cancelled) {
            await safeStopScanner(instance);
            return;
          }
          console.warn('Essai caméra frontale/arrière échoué, essai repli :', firstErr);
          const fallbackFacing = facingMode === 'environment' ? 'user' : 'environment';
          try {
            await instance.start(
              { facingMode: fallbackFacing },
              { fps: 10 },
              onScanSuccess,
              () => {}
            );
          } catch (secondErr) {
            if (cancelled) {
              await safeStopScanner(instance);
              return;
            }
            console.warn('Essai repli facingMode échoué, essai device direct :', secondErr);
            if (deviceList.length > 0 && deviceList[0]?.id) {
              await instance.start(
                deviceList[0].id,
                { fps: 10 },
                onScanSuccess,
                () => {}
              );
            } else {
              throw secondErr;
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('Caméra non disponible :', err?.message || err);
        await safeStopScanner(instance);
        html5QrRef.current = null;

        let msg = "Impossible d'activer la caméra en continu.";
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          msg = "Permission refusée. Veuillez autoriser l'accès à la caméra dans votre navigateur.";
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          msg = "Aucune caméra détectée. Prenez un cliché photo ou utilisez la saisie manuelle.";
        } else {
          msg = "Caméra occupée ou non reconnue. Prenez une photo directe ou saisissez le code.";
        }

        setCameraError(msg);
        setCameraOpen(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (html5QrRef.current) {
        const instance = html5QrRef.current;
        html5QrRef.current = null;
        safeStopScanner(instance);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cameraOpen, facingMode, isSecure]);

  const totalSession = historiqueSession.length;
  const autorisesSession = historiqueSession.filter((h) => h.autorise).length;
  const refusesSession = historiqueSession.filter((h) => !h.autorise).length;

  return (
    <main className="main-content scan-onboarding-container">
      {/* En-tête simple et épuré */}
      <div className="scan-wizard-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="scan-main-title" style={{ margin: 0, fontSize: '1.25rem' }}>Contrôle des Titres</h1>

        <div className="scan-quick-tools">
          {step === 'scanner' && (
            <button
              type="button"
              className={`tool-pill-btn camera-flip-pill${facingMode === 'environment' ? ' active' : ''}`}
              onClick={handleFlipCamera}
              title={facingMode === 'environment' ? "Passer en caméra frontale" : "Passer en caméra arrière"}
              aria-label="Inverser la caméra"
            >
              <span className="material-symbols-outlined">flip_camera_ios</span>
              <span className="tool-pill-cam-label">{facingMode === 'environment' ? 'Dos' : 'Face'}</span>
            </button>
          )}

          <button
            type="button"
            className={`tool-pill-btn${soundEnabled ? ' active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
          >
            <span className="material-symbols-outlined">
              {soundEnabled ? 'volume_up' : 'volume_off'}
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          ÉTAPE 1 : LE SCANNER CAMÉRA ÉPURÉ ET SANS DISTRACTION
          ========================================================================= */}
      {step === 'scanner' && (
        <section className="scan-step-view scan-step-camera">
          {/* Bandeau d'alerte si connexion HTTP non sécurisée */}
          {!isSecure && (
            <div
              className="offline-notice"
              style={{
                borderLeft: '4px solid #f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                maxWidth: '440px',
                margin: '0 auto 1rem',
                borderRadius: '16px',
                padding: '1rem',
              }}
            >
              <span className="material-symbols-outlined offline-icon" style={{ color: '#f59e0b', fontSize: '28px' }}>
                lock
              </span>
              <div>
                <div className="offline-title" style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                  Connexion sécurisée requise
                </div>
                <div className="offline-text" style={{ margin: '4px 0 10px', fontSize: '0.82rem', lineHeight: '1.4' }}>
                  Le navigateur requiert une connexion HTTPS pour accéder à la caméra.
                </div>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="offline-notice" style={{ maxWidth: '420px', margin: '0 auto 1rem' }}>
              <span className="material-symbols-outlined offline-icon">videocam_off</span>
              <div>
                <div className="offline-title">Accès caméra restreint</div>
                <div className="offline-text">{cameraError}</div>
                <div style={{ marginTop: '0.65rem' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                    onClick={() => {
                      setCameraError(null);
                      setCameraOpen(true);
                    }}
                  >
                    Réessayer la caméra
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Viseur caméra immersif épuré (un seul carré de cadrage net) */}
          <div className="scan-hero-viewfinder-wrapper">
            <div className="scanner-viewfinder-overlay">
              <div id={QR_READER_ID} className="qr-camera-view" style={{ width: '100%', height: '100%' }} />

              {/* Repères et laser de scan (l'unique carré propre) */}
              <div className="scanner-viewfinder-box">
                <span className="scanner-bracket scanner-bracket-tl"></span>
                <span className="scanner-bracket scanner-bracket-tr"></span>
                <span className="scanner-bracket scanner-bracket-bl"></span>
                <span className="scanner-bracket scanner-bracket-br"></span>
                <div className="scanner-laser-line"></div>
              </div>
            </div>
          </div>

          {/* Pilule d'état de scan dégagée et centrée sous le viseur */}
          <div className="scanner-status-pill-row">
            <div className={`scanner-status-pill${loading ? ' loading' : ''}`}>
              <span className="pulse-indicator"></span>
              <span>{loading ? 'Vérification...' : 'Visez le QR Code'}</span>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          ÉTAPE 2 : L'ÉCRAN DE DÉCISION PLEIN FORMAT (INSTANTANÉ, ULTRA-LISIBLE)
          ========================================================================= */}
      {step === 'result' && resultat && (
        <section className="scan-step-view scan-step-decision">
          <div className={`scan-decision-card ${resultat.autorise ? 'autorise' : 'refuse'}`}>
            <div className={`decision-icon-circle ${resultat.autorise ? 'autorise' : 'refuse'}`}>
              <span className="material-symbols-outlined">
                {resultat.autorise ? 'check_circle' : 'cancel'}
              </span>
            </div>

            <h1 className="decision-title">
              {resultat.autorise ? 'VOYAGE AUTORISÉ' : 'VOYAGE REFUSÉ'}
            </h1>

            {!resultat.autorise && resultat.motifRefus && (
              <div className="decision-reason-box" style={motifColors(resultat.motifRefus)}>
                <span className="material-symbols-outlined reason-icon">error_outline</span>
                <span className="reason-text">{motifLabel(resultat.motifRefus)}</span>
              </div>
            )}

            <p className="decision-message">
              {resultat.message || (resultat.autorise ? 'Titre valide et contrôlé avec succès' : 'Validation non accordée')}
            </p>

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
