import React, { useState, useRef, useEffect } from 'react';
import { scannerValidation, getTitres } from '../services/apiBilletterie';
import { motifLabel, motifColors } from '../utils/motifsRefus';

// Bips sonores synthétisés natifs sans fichiers externes
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
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Ré5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // La5
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
      osc.frequency.setValueAtTime(220, ctx.currentTime); // La3
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15); // Mi3
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Si l'audio est restreint par le navigateur, continuer sans son
  }
}

function ScanValidation() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [historiqueSession, setHistoriqueSession] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [availableTitres, setAvailableTitres] = useState([]);

  const inputRef = useRef(null);

  // Charger les titres disponibles pour faciliter les tests/démonstration rapide
  useEffect(() => {
    getTitres()
      .then((titres) => {
        if (Array.isArray(titres)) setAvailableTitres(titres.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  // Maintenir le focus sur l'input pour la douchette de scan
  useEffect(() => {
    inputRef.current?.focus();
  }, [resultat]);

  const handleScan = async (codeToScan) => {
    const raw = (codeToScan || code).trim();
    if (!raw) return;

    setLoading(true);
    setResultat(null);

    try {
      const res = await scannerValidation(raw);
      setResultat(res);

      if (soundEnabled) {
        playAudioFeedback(res.autorise);
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
        ...prev.slice(0, 9),
      ]);
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
        ...prev.slice(0, 9),
      ]);
    } finally {
      setLoading(false);
      setCode('');
    }
  };

  const totalSession = historiqueSession.length;
  const autorisesSession = historiqueSession.filter((h) => h.autorise).length;
  const refusesSession = historiqueSession.filter((h) => !h.autorise).length;

  return (
    <main className="main-content scan-page">
      <section className="page-header">
        <div>
          <h1 className="page-title">Scan et contrôle</h1>
          <p className="page-subtitle">
            Lecture des QR Codes et vérification de la validité des titres de transport
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="btn-secondary"
          title={soundEnabled ? 'Désactiver les signaux sonores' : 'Activer les signaux sonores'}
        >
          <span className="material-symbols-outlined btn-icon">
            {soundEnabled ? 'volume_up' : 'volume_off'}
          </span>
          {soundEnabled ? 'Son activé' : 'Son muet'}
        </button>
      </section>

      <section className="scan-stats-row">
        <div className="stats-card scan-stat">
          <span className="metric-label">Scans (session)</span>
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
      </section>

      <section className="stats-card scan-box">
        <form
          className="scan-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
        >
          <div className="form-group">
            <label htmlFor="qr-input" className="form-label">
              Scannez le QR Code ou saisissez le code du titre
            </label>
            <div className="scan-input-row">
              <input
                id="qr-input"
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: TKT-a94f83bc..."
                className="form-input scan-code-input"
                autoComplete="off"
              />
              <button type="submit" className="btn-primary" disabled={loading || !code.trim()}>
                {loading ? 'Vérification...' : 'Valider'}
              </button>
            </div>
          </div>

          <p className="scan-hint">Compatible douchette optique, lecteur laser et saisie manuelle.</p>
        </form>

        {availableTitres.length > 0 && (
          <div className="scan-demo-shortcuts">
            <span className="scan-demo-label">Tester avec un titre existant :</span>
            <div className="scan-demo-buttons">
              {availableTitres.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleScan(t.codeUnique)}
                  className="filter-chip"
                >
                  {t.typeTitre} ({t.statut})
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {resultat && (
        <section className={`scan-result ${resultat.autorise ? 'autorise' : 'refuse'}`}>
          <span className="material-symbols-outlined scan-result-icon">
            {resultat.autorise ? 'check_circle' : 'cancel'}
          </span>

          <h2 className="scan-result-title">{resultat.autorise ? 'Voyage autorisé' : 'Voyage refusé'}</h2>

          <p className="scan-result-message">
            {resultat.message || (resultat.autorise ? 'Titre valide' : 'Validation non permise')}
          </p>

          {(resultat.titre?.typeTitre || resultat.abonnement?.voyagesRestants !== undefined || resultat.validation?.id) && (
            <div className="scan-result-details">
              {resultat.titre?.typeTitre && (
                <span>Type : <strong>{resultat.titre.typeTitre.replace('_', ' ')}</strong></span>
              )}
              {resultat.abonnement?.voyagesRestants !== undefined && (
                <span>Voyages restants : <strong>{resultat.abonnement.voyagesRestants}</strong></span>
              )}
              {resultat.validation?.id && (
                <span>Contrôle : <code>{resultat.validation.id}</code></span>
              )}
            </div>
          )}
        </section>
      )}

      {historiqueSession.length > 0 && (
        <section className="table-card">
          <h3 className="stats-card-title">Derniers contrôles de la session</h3>
          <div className="table-responsive">
            <table className="user-table">
              <thead>
                <tr className="table-header-row">
                  <th className="table-header-th">Heure</th>
                  <th className="table-header-th">Résultat</th>
                  <th className="table-header-th">Code scanné</th>
                  <th className="table-header-th">Motif / Détail</th>
                </tr>
              </thead>
              <tbody>
                {historiqueSession.map((item, idx) => (
                  <tr key={idx} className="table-row">
                    <td className="table-td">{item.heure}</td>
                    <td className="table-td">
                      <span
                        className="role-badge"
                        style={{
                          backgroundColor: item.autorise ? '#dcfce7' : '#fee2e2',
                          color: item.autorise ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {item.autorise ? 'Autorisé' : 'Refusé'}
                      </span>
                    </td>
                    <td className="table-td-id">{item.code}</td>
                    <td className="table-td">
                      {item.motifRefus ? (
                        <span className="role-badge" style={motifColors(item.motifRefus)}>
                          {motifLabel(item.motifRefus)}
                        </span>
                      ) : (
                        item.message || '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

export default ScanValidation;
