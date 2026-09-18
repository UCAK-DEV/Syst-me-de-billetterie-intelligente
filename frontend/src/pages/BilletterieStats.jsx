import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStatsBilletterie } from '../services/apiBilletterie';
import { motifLabel } from '../utils/motifsRefus';

const TYPE_ROWS = [
  { key: 'TICKET_SIMPLE', label: 'Tickets simples', color: '#3b82f6' },
  { key: 'LIMITE', label: 'Abonnements limités', color: '#8b5cf6' },
  { key: 'ILLIMITE', label: 'Abonnements illimités', color: '#10b981' },
];

const number = (value) => Number(value || 0).toLocaleString('fr-FR');

function BilletterieStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showJustifications, setShowJustifications] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const todayISO = useMemo(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }, []);

  const loadStats = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await getStatsBilletterie();
      setStats(result.stats);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.message || 'Erreur lors du calcul des statistiques');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Stats billetterie — Billetterie Intelligente';
    loadStats();
  }, [loadStats]);

  if (loading) return <main className="main-content"><div className="loader-container"><span className="page-loader" /><p className="loader-text">Calcul des indicateurs...</p></div></main>;

  if (error || !stats) {
    return <main className="main-content"><div className="offline-notice"><span className="material-symbols-outlined offline-icon">cloud_off</span><div><div className="offline-title">Statistiques indisponibles</div><div className="offline-text">{error || 'Impossible de récupérer les statistiques de billetterie.'}</div></div><button type="button" className="btn-secondary bts-retry" onClick={() => loadStats()}>Réessayer</button></div></main>;
  }

  const titresParStatut = stats.titresParStatut || {};
  const titresParType = stats.titresParType || {};
  const refusParMotif = stats.refusParMotif || {};
  const validationsParHeure = stats.validationsParHeure || {};
  const totalValidations = Number(stats.totalValidations || 0);
  const totalTitres = Number(stats.totalTitres || 0);
  const autorises = Number(stats.autorises || 0);
  const refuses = Number(stats.refuses || 0);
  const tauxSucces = Number(stats.tauxSucces || 0);
  const tauxRejet = totalValidations > 0 ? (100 - tauxSucces).toFixed(1) : '0';
  const maxHoraire = Math.max(...Object.values(validationsParHeure).map(Number), 1);

  return (
    <main className="main-content bts-dashboard-page">
      <section className="page-header bts-dashboard-header">
        <div>
          <p className="dashboard-eyebrow">Pilotage des contrôles</p>
          <h1 className="page-title">Statistiques de billetterie</h1>
          <p className="page-subtitle">Affluence, autorisations et incidents du réseau de transport.</p>
        </div>
        <div className="bts-header-actions">
          {updatedAt && <span className="dashboard-updated"><i />Actualisé à {updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
          <button type="button" className="dashboard-refresh" onClick={() => loadStats(true)} disabled={refreshing} aria-label="Actualiser les indicateurs" title="Actualiser les indicateurs"><span className={`material-symbols-outlined${refreshing ? ' spin' : ''}`}>refresh</span></button>
          <button type="button" onClick={() => setShowJustifications((value) => !value)} className="btn-secondary"><span className="material-symbols-outlined btn-icon">help_outline</span>{showJustifications ? 'Masquer l’aide' : 'Comprendre les indicateurs'}</button>
        </div>
      </section>

      {showJustifications && <section className="table-card bts-justification"><h2 className="stats-card-title">Comment lire ce tableau de bord</h2><ul className="bts-justification-list"><li>Les validations mesurent tous les contrôles réalisés ; les barres horaires ne couvrent que la journée en cours.</li><li>Le taux d’autorisation signale l’expérience voyageur et les éventuels problèmes de titres ou de contrôle.</li><li>Les motifs de refus permettent de distinguer les cas de fraude, les droits arrivés à échéance et les incidents techniques.</li></ul></section>}

      <section className="stats-grid bts-metric-grid">
        <Link to="/titres?statut=ACTIF" className="stats-card stats-card-link"><div className="stats-card-header"><span className="material-symbols-outlined stats-card-icon bts-icon-violet">confirmation_number</span><h2 className="stats-card-title">Titres émis</h2></div><span className="metric-value">{number(totalTitres)}</span><div className="metric-detail">{number(titresParStatut.ACTIF)} actifs disponibles <span>→</span></div></Link>
        <Link to={`/validations?date=${todayISO}`} className="stats-card stats-card-link"><div className="stats-card-header"><span className="material-symbols-outlined stats-card-icon bts-icon-blue">qr_code_scanner</span><h2 className="stats-card-title">Contrôles aujourd’hui</h2></div><span className="metric-value">{number(stats.validationsAujourdhui)}</span><div className="metric-detail">Voir les scans de la journée <span>→</span></div></Link>
        <Link to={`/validations?resultat=AUTORISE&date=${todayISO}`} className="stats-card stats-card-link"><div className="stats-card-header"><span className="material-symbols-outlined stats-card-icon bts-icon-green">check_circle</span><h2 className="stats-card-title">Voyages autorisés</h2></div><span className="metric-value status-actif">{number(autorises)}</span><div className="metric-detail">{tauxSucces}% d’autorisation <span>→</span></div></Link>
        <Link to="/validations?resultat=REFUSE" className="stats-card stats-card-link"><div className="stats-card-header"><span className="material-symbols-outlined stats-card-icon bts-icon-red">block</span><h2 className="stats-card-title">Voyages refusés</h2></div><span className="metric-value status-supprime">{number(refuses)}</span><div className="metric-detail">{tauxRejet}% de rejet <span>→</span></div></Link>
      </section>

      <section className="bts-two-col-grid">
        <article className="table-card"><div className="bts-panel-head"><div><p className="dashboard-card-kicker">Portefeuille</p><h2 className="stats-card-title">Répartition des titres</h2></div><Link to="/titres">Gérer les titres →</Link></div><div className="bts-progress-list">{TYPE_ROWS.map(({ key, label, color }) => { const count = Number(titresParType[key] || 0); return <Link key={key} to={`/titres?typeTitre=${key}`} className="bts-progress-row bts-progress-row-link"><div className="bts-progress-label"><span>{label}</span><strong>{number(count)}</strong></div><div className="bts-progress-track"><div className="bts-progress-fill" style={{ backgroundColor: color, width: `${totalTitres ? (count / totalTitres) * 100 : 0}%` }} /></div></Link>; })}</div></article>
        <article className="table-card"><div className="bts-panel-head"><div><p className="dashboard-card-kicker">Incidents</p><h2 className="stats-card-title">Motifs de refus</h2></div><Link to="/validations?resultat=REFUSE">Historique →</Link></div>{Object.keys(refusParMotif).length === 0 ? <p className="bts-empty-hint">Aucun voyage refusé pour le moment.</p> : <div className="bts-progress-list">{Object.entries(refusParMotif).sort(([, left], [, right]) => Number(right) - Number(left)).map(([motif, count]) => <Link key={motif} to={`/validations?resultat=REFUSE&motifRefus=${motif}`} className="bts-progress-row bts-progress-row-link"><div className="bts-progress-label"><span>{motifLabel(motif)}</span><strong>{number(count)}</strong></div><div className="bts-progress-track"><div className="bts-progress-fill" style={{ backgroundColor: '#ef4444', width: `${refuses ? (Number(count) / refuses) * 100 : 0}%` }} /></div></Link>)}</div>}</article>
      </section>

      <section className="table-card"><div className="bts-panel-head"><div><p className="dashboard-card-kicker">Aujourd’hui</p><h2 className="stats-card-title">Activité par tranche horaire</h2></div><Link to={`/validations?date=${todayISO}`}>Voir les contrôles →</Link></div>{totalValidations === 0 ? <p className="bts-empty-hint">Aucun contrôle enregistré pour l’instant. Les scans du jour apparaîtront ici.</p> : <div className="bts-hourly-chart" aria-label="Histogramme des validations de la journée">{Object.entries(validationsParHeure).map(([hour, count]) => { const value = Number(count); const height = Math.max((value / maxHoraire) * 100, value > 0 ? 8 : 2); return <Link key={hour} to={`/validations?date=${todayISO}`} className="bts-hourly-col" title={`${hour}h : ${value} validation(s)`}><span className="bts-hourly-value">{value || ''}</span><span className={`bts-hourly-bar${value > 0 ? ' active' : ''}`} style={{ height: `${height}%` }} /><span className="bts-hourly-label">{Number(hour) % 3 === 0 ? `${hour}h` : ''}</span></Link>; })}</div>}</section>
    </main>
  );
}

export default BilletterieStats;
