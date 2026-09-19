import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getValidations } from '../services/apiBilletterie';
import { api } from '../services/api';
import { motifLabel, motifColors } from '../utils/motifsRefus';
import { formatDateFR } from '../utils/dates';

const MOTIFS_OPTIONS = [
  { val: 'QR_CODE_INCONNU', label: 'QR Code inconnu' },
  { val: 'QR_CODE_DESACTIVE', label: 'QR Code désactivé' },
  { val: 'TICKET_DEJA_UTILISE', label: 'Ticket déjà utilisé' },
  { val: 'SOLDE_EPUISE', label: 'Solde de voyages épuisé' },
  { val: 'ABONNEMENT_EXPIRE', label: 'Abonnement expiré' },
  { val: 'ABONNEMENT_SUSPENDU', label: 'Abonnement suspendu' },
  { val: 'ABONNEMENT_RESILIE', label: 'Abonnement résilié' },
  { val: 'ABONNEMENT_PAS_ENCORE_VALIDE', label: 'Abonnement pas encore valide' },
  { val: 'AUCUN_TITRE_VALIDE', label: 'Aucun titre valide' },
  { val: 'SERVICE_INDISPONIBLE', label: 'Service indisponible' },
];

function ValidationsHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlResultat = searchParams.get('resultat');
  const urlMotif = searchParams.get('motifRefus') || searchParams.get('motif');
  const urlDate = searchParams.get('date');

  const [validations, setValidations] = useState([]);
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtres
  const [resultatFilter, setResultatFilter] = useState(urlResultat || '');
  const [motifFilter, setMotifFilter] = useState(urlMotif || '');
  const [dateFilter, setDateFilter] = useState(urlDate || '');
  const [search, setSearch] = useState('');

  // Synchronisation avec l'URL
  useEffect(() => {
    if (urlResultat) {
      setResultatFilter(urlResultat);
    } else if (!searchParams.has('resultat')) {
      setResultatFilter('');
    }

    if (urlMotif) {
      setMotifFilter(urlMotif);
    } else if (!searchParams.has('motifRefus') && !searchParams.has('motif')) {
      setMotifFilter('');
    }

    if (urlDate) {
      setDateFilter(urlDate);
    } else if (!searchParams.has('date')) {
      setDateFilter('');
    }
  }, [urlResultat, urlMotif, urlDate, searchParams]);

  const loadValidations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getValidations({
        resultat: resultatFilter,
        motifRefus: motifFilter,
        date: dateFilter,
        recherche: search,
      });
      const list = Array.isArray(data) ? data : [];
      setValidations(list);

      const ids = [...new Set(list.map((v) => v.agentId).filter(Boolean))];
      if (ids.length > 0) {
        api.lookupUsers(ids)
          .then((res) => {
            const map = {};
            (res.users || []).forEach((a) => { map[a.id] = a; });
            setAgents(map);
          })
          .catch(() => {});
      }
    } catch (err) {
      setError(err.message || "Erreur lors de la récupération de l'historique");
    } finally {
      setLoading(false);
    }
  }, [resultatFilter, motifFilter, dateFilter, search]);

  useEffect(() => {
    loadValidations();
  }, [loadValidations]);

  return (
    <main className="main-content">
      <section className="page-header">
        <div>
          <h1 className="page-title">Historique des validations</h1>
          <p className="page-subtitle">Traçabilité des contrôles autorisés et des tentatives refusées</p>
        </div>
      </section>

      {error && (
        <div className="offline-notice">
          <span className="material-symbols-outlined offline-icon">error</span>
          <div>
            <div className="offline-title">Une erreur est survenue</div>
            <div className="offline-text">{error}</div>
          </div>
        </div>
      )}

      {(urlResultat || urlMotif || urlDate) && (
        <div className="offline-notice" style={{ marginBottom: '1.25rem' }}>
          <span className="material-symbols-outlined offline-icon">filter_alt</span>
          <div>
            <div className="offline-title">
              Filtre actif : {urlResultat && `Résultat : ${urlResultat === 'AUTORISE' ? 'Autorisé' : 'Refusé'}`}
              {urlMotif && `${urlResultat ? ' · ' : ''}Motif : ${motifLabel(urlMotif)}`}
              {urlDate && `${urlResultat || urlMotif ? ' · ' : ''}Date : ${formatDateFR(urlDate)}`}
            </div>
            <div className="offline-text">Filtre ciblé appliqué depuis le tableau de bord.</div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              setSearchParams({});
              setResultatFilter('');
              setMotifFilter('');
              setDateFilter('');
            }}
          >
            Afficher tout
          </button>
        </div>
      )}

      {/* Pilules de filtres tactiles rapides (Style Maquette Mobile) */}
      <div className="history-filter-pills">
        <button
          type="button"
          className={`history-pill${!dateFilter && !resultatFilter ? ' active' : ''}`}
          onClick={() => {
            setDateFilter('');
            setResultatFilter('');
            setMotifFilter('');
          }}
        >
          Tous les scans
        </button>

        <button
          type="button"
          className={`history-pill${dateFilter === new Date().toISOString().split('T')[0] ? ' active' : ''}`}
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setDateFilter(today);
          }}
        >
          Aujourd'hui
        </button>

        <button
          type="button"
          className={`history-pill${resultatFilter === 'AUTORISE' ? ' active' : ''}`}
          onClick={() => {
            setResultatFilter(resultatFilter === 'AUTORISE' ? '' : 'AUTORISE');
          }}
        >
          Autorisés
        </button>

        <button
          type="button"
          className={`history-pill${resultatFilter === 'REFUSE' ? ' active' : ''}`}
          onClick={() => {
            setResultatFilter(resultatFilter === 'REFUSE' ? '' : 'REFUSE');
          }}
        >
          Refusés
        </button>
      </div>

      <section className="filter-toolbar">
        <div className="search-wrapper">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par ID validation, code ou ID client..."
          />
        </div>

        <div className="filter-dropdowns">
          <div className="filter-dropdown-item">
            <label className="filter-label">Résultat</label>
            <select className="filter-select" value={resultatFilter} onChange={(e) => setResultatFilter(e.target.value)}>
              <option value="">Tous les résultats</option>
              <option value="AUTORISE">Autorisé</option>
              <option value="REFUSE">Refusé</option>
            </select>
          </div>

          <div className="filter-dropdown-item">
            <label className="filter-label">Motif de refus</label>
            <select className="filter-select" value={motifFilter} onChange={(e) => setMotifFilter(e.target.value)}>
              <option value="">Tous les motifs</option>
              {MOTIFS_OPTIONS.map((m) => (
                <option key={m.val} value={m.val}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-dropdown-item">
            <label className="filter-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="table-card">
        {loading ? (
          <div className="loader-container">
            <span className="page-loader"></span>
            <p className="loader-text">Chargement de l'historique...</p>
          </div>
        ) : (
          <>
            {/* Liste de cartes mobiles (Maquette écran gauche) */}
            <div className="history-mobile-cards">
              {validations.length > 0 ? (
                validations.map((v) => (
                  <div key={v.id} className="history-card-item">
                    <div className="history-card-left">
                      <div className={`history-card-icon-box ${v.resultat === 'AUTORISE' ? 'autorise' : 'refuse'}`}>
                        <span className="material-symbols-outlined">
                          {v.resultat === 'AUTORISE' ? 'confirmation_number' : 'block'}
                        </span>
                      </div>
                      <div className="history-card-details">
                        <span className="history-card-title">{v.codeScanne || `Scan #${v.id.substring(0, 8)}`}</span>
                        <span className="history-card-meta">
                          {formatDateFR(v.dateValidation)} à {v.heureValidation}
                          {agents[v.agentId] ? ` · ${agents[v.agentId].prenom} ${agents[v.agentId].nom}` : ''}
                        </span>
                        {v.motifRefus && (
                          <div style={{ marginTop: '2px' }}>
                            <span className="role-badge" style={motifColors(v.motifRefus)}>
                              {motifLabel(v.motifRefus)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="history-card-right">
                      <span
                        className="role-badge"
                        style={{
                          backgroundColor: v.resultat === 'AUTORISE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: v.resultat === 'AUTORISE' ? '#10b981' : '#ef4444',
                          border: `1px solid ${v.resultat === 'AUTORISE' ? '#10b981' : '#ef4444'}`,
                        }}
                      >
                        {v.resultat === 'AUTORISE' ? 'Autorisé' : 'Refusé'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Aucune validation trouvée pour ces filtres.
                </div>
              )}
            </div>

            {/* Tableau complet pour écran desktop */}
            <div className="table-responsive client-desktop-table">
              <table className="user-table">
                <thead>
                  <tr className="table-header-row">
                    <th className="table-header-th">ID validation</th>
                    <th className="table-header-th">Date &amp; heure</th>
                    <th className="table-header-th">Résultat</th>
                    <th className="table-header-th">Code scanné</th>
                    <th className="table-header-th">Motif du refus</th>
                    <th className="table-header-th">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {validations.length > 0 ? (
                    validations.map((v) => (
                      <tr key={v.id} className="table-row">
                        <td className="table-td-id">{v.id}</td>
                        <td className="table-td">
                          <div>{formatDateFR(v.dateValidation)}</div>
                          <div className="titre-meta">{v.heureValidation}</div>
                        </td>
                        <td className="table-td">
                          <span
                            className="role-badge"
                            style={{
                              backgroundColor: v.resultat === 'AUTORISE' ? '#dcfce7' : '#fee2e2',
                              color: v.resultat === 'AUTORISE' ? '#15803d' : '#b91c1c',
                            }}
                          >
                            {v.resultat === 'AUTORISE' ? 'Autorisé' : 'Refusé'}
                          </span>
                        </td>
                        <td className="table-td-id">{v.codeScanne}</td>
                        <td className="table-td">
                          {v.motifRefus ? (
                            <span className="role-badge" style={motifColors(v.motifRefus)}>
                              {motifLabel(v.motifRefus)}
                            </span>
                          ) : (
                            <span className="titre-meta">—</span>
                          )}
                        </td>
                        <td className="table-td">
                          {agents[v.agentId] ? (
                            `${agents[v.agentId].prenom} ${agents[v.agentId].nom}`
                          ) : (
                            <span className="table-td-id">{v.agentId.substring(0, 10)}...</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="table-empty-cell">
                        {search || resultatFilter || motifFilter || dateFilter
                          ? 'Aucune validation ne correspond à ces critères.'
                          : 'Aucune validation enregistrée — les contrôles effectués depuis la page Scan apparaîtront ici.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default ValidationsHistory;
