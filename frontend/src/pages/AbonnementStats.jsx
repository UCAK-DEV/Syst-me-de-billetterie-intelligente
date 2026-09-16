import React, { useState, useEffect } from 'react';
import { getStatsAbonnements } from '../services/apiAbonnements';

const STATUT_LABELS = {
  ACTIF: 'Actif',
  SUSPENDU: 'Suspendu',
  EXPIRE: 'Expiré',
  EPUISE: 'Épuisé',
  RESILIE: 'Résilié',
};

const STATUT_COLORS = {
  ACTIF: '#10b981',
  SUSPENDU: '#f59e0b',
  EXPIRE: '#64748b',
  EPUISE: '#ef4444',
  RESILIE: '#94a3b8',
};

const TYPE_LABELS = {
  TICKET_SIMPLE: 'Ticket simple',
  LIMITE: 'Limité',
  ILLIMITE: 'Illimité',
};

function AbonnementStats() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "Tableau de bord Abonnements - Système de Billetterie";
    getStatsAbonnements()
      .then(({ stats }) => setStats(stats))
      .catch((err) => console.error('Impossible de récupérer les statistiques', err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <main className="main-content">
        <div className="loader-container">
          <span className="page-loader"></span>
          <p className="loader-text">Chargement des statistiques...</p>
        </div>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="main-content">
        <div className="offline-notice">
          <span className="material-symbols-outlined offline-icon">cloud_off</span>
          <div>
            <div className="offline-title">Statistiques indisponibles</div>
            <div className="offline-text">Impossible de récupérer les statistiques des abonnements.</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <section className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord des abonnements</h1>
          <p className="page-subtitle">Vue d'ensemble des souscriptions actives et de leur usage</p>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stats-card">
          <div className="stats-card-header">
            <span className="material-symbols-outlined stats-card-icon" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
              card_membership
            </span>
            <h3 className="stats-card-title">Total abonnements</h3>
          </div>
          <span className="metric-value">{stats.total}</span>
        </div>

        <div className="stats-card">
          <div className="stats-card-header">
            <span className="material-symbols-outlined stats-card-icon" style={{ backgroundColor: '#f0fdf4', color: '#059669' }}>
              payments
            </span>
            <h3 className="stats-card-title">Revenu total</h3>
          </div>
          <span className="metric-value">{stats.revenuTotal.toLocaleString('fr-FR')} FCFA</span>
        </div>

        <div className="stats-card">
          <div className="stats-card-header">
            <span className="material-symbols-outlined stats-card-icon" style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>
              directions_bus
            </span>
            <h3 className="stats-card-title">Voyages consommés</h3>
          </div>
          <span className="metric-value">{stats.voyagesConsommesTotal}</span>
        </div>

        <div className="stats-card">
          <div className="stats-card-header">
            <span className="material-symbols-outlined stats-card-icon" style={{ backgroundColor: '#fffbeb', color: '#b45309' }}>
              schedule
            </span>
            <h3 className="stats-card-title">Expirent sous 7 jours</h3>
          </div>
          <span className="metric-value">{stats.expirentSous7Jours}</span>
        </div>
      </section>

      <section className="table-card" style={{ padding: '1.5rem 2rem' }}>
        <h3 className="stats-card-title" style={{ marginBottom: '1rem' }}>Répartition par statut</h3>
        <div className="modal-grid">
          {Object.entries(stats.parStatut).map(([statut, count]) => (
            <div key={statut} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="status-dot" style={{ backgroundColor: STATUT_COLORS[statut] }}></span>
              <span className="status-text">{STATUT_LABELS[statut] || statut}</span>
              <span className="metric-value" style={{ fontSize: '1rem', marginLeft: 'auto' }}>{count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="table-card" style={{ padding: '1.5rem 2rem' }}>
        <h3 className="stats-card-title" style={{ marginBottom: '1rem' }}>Répartition par type de formule</h3>
        <div className="modal-grid">
          {Object.entries(stats.parType).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="status-text">{TYPE_LABELS[type] || type}</span>
              <span className="metric-value" style={{ fontSize: '1rem', marginLeft: 'auto' }}>{count}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default AbonnementStats;
