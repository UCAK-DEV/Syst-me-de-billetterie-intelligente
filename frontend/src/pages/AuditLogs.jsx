import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getAudits } from '../services/apiBilletterie';
import { api } from '../services/api';
import { formatDateFR, formatDateTimeFR } from '../utils/dates';
import { motifLabel } from '../utils/motifsRefus';
import '../styles/dashboard.css';
import '../styles/audit.css';

const ACTIONS_INFO = {
  GENERATION_TITRE: {
    label: 'Émission de titre',
    icon: 'confirmation_number',
    color: '#3b82f6',
  },
  DESACTIVATION_TITRE: {
    label: 'Désactivation de titre',
    icon: 'block',
    color: '#ef4444',
  },
  ACTIVATION_TITRE: {
    label: 'Réactivation de titre',
    icon: 'check_circle',
    color: '#10b981',
  },
  SCAN_VALIDATION: {
    label: 'Scan de contrôle',
    icon: 'qr_code_scanner',
    color: '#6366f1',
  },
  VALIDATION_MANUELLE: {
    label: 'Validation manuelle',
    icon: 'front_hand',
    color: '#8b5cf6',
  },
};

const RESSOURCES_LABELS = {
  TITRE: 'Titre',
  VALIDATION: 'Preuve de passage',
  UTILISATEUR: 'Compte client',
  SYSTEME: 'Système',
};

const ROLE_COLORS = {
  Administrateur: { backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' },
  Agent: { backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
};

function humanContext(audit) {
  if (!audit) return '';
  const d = audit.details || {};
  if (audit.action === 'SCAN_VALIDATION') {
    const sens = d.typePassage === 'SORTIE' ? 'Sortie' : 'Entrée';
    if (d.resultatScan === 'REFUSE') {
      return `${sens} refusée : ${motifLabel(d.motifRefus) || 'Titre non valide'}`;
    }
    if (d.resultatScan === 'AUTORISE') {
      return `${sens} autorisée${d.typeTitre ? ` (${d.typeTitre})` : ''}`;
    }
  }
  if (audit.action === 'GENERATION_TITRE') {
    return d.typeTitre ? `Titre ${d.typeTitre} émis` : 'Nouveau titre émis';
  }
  if (audit.action === 'DESACTIVATION_TITRE') {
    return 'Titre désactivé / bloqué';
  }
  if (audit.action === 'ACTIVATION_TITRE') {
    return 'Titre réactivé';
  }
  if (audit.action === 'VALIDATION_MANUELLE') {
    return 'Passage forcé manuellement par l’agent';
  }
  return '';
}

function AuditLogs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlAction = searchParams.get('action');
  const urlDate = searchParams.get('date');
  const urlResultat = searchParams.get('resultat');

  const [audits, setAudits] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Filtres
  const [activeTab, setActiveTab] = useState('TOUS'); // TOUS, PASSAGES_OK, REFUS, TITRES
  const [actionFilter, setActionFilter] = useState(urlAction || '');
  const [resultatFilter, setResultatFilter] = useState(urlResultat || '');
  const [dateFilter, setDateFilter] = useState(urlDate || '');
  const [search, setSearch] = useState('');

  // Synchronisation avec l'URL
  useEffect(() => {
    if (urlAction) setActionFilter(urlAction);
    else if (!searchParams.has('action')) setActionFilter('');

    if (urlResultat) setResultatFilter(urlResultat);
    else if (!searchParams.has('resultat')) setResultatFilter('');

    if (urlDate) setDateFilter(urlDate);
    else if (!searchParams.has('date')) setDateFilter('');
  }, [urlAction, urlResultat, urlDate, searchParams]);

  const loadAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAudits({
        action: actionFilter,
        resultat: resultatFilter,
        date: dateFilter,
        recherche: search,
      });
      const list = Array.isArray(data) ? data : [];
      setAudits(list);

      // Résolution des noms (Agents et Voyageurs)
      const ids = [
        ...new Set(
          list
            .flatMap((a) => [
              a.utilisateurId,
              a.details?.voyageurId,
              a.details?.utilisateurId,
            ])
            .filter(Boolean)
        ),
      ];

      if (ids.length > 0) {
        api.lookupUsers(ids)
          .then((res) => {
            const map = {};
            (res.users || []).forEach((u) => { map[u.id] = u; });
            setUtilisateurs(map);
          })
          .catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des logs de litige');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resultatFilter, dateFilter, search]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  // Filtrage selon l'onglet actif
  const filteredAudits = useMemo(() => {
    return audits.filter((a) => {
      if (activeTab === 'PASSAGES_OK') {
        return a.action === 'SCAN_VALIDATION' && a.resultat === 'SUCCES';
      }
      if (activeTab === 'REFUS') {
        return a.resultat === 'ECHEC' || (a.action === 'SCAN_VALIDATION' && a.details?.resultatScan === 'REFUSE');
      }
      if (activeTab === 'TITRES') {
        return ['GENERATION_TITRE', 'DESACTIVATION_TITRE', 'ACTIVATION_TITRE'].includes(a.action);
      }
      return true;
    });
  }, [audits, activeTab]);

  // Métriques de pilotage des litiges
  const metrics = useMemo(() => {
    let entreesSortiesOK = 0;
    let refusPassage = 0;
    let actionsTitres = 0;
    let aujourdhui = 0;
    const today = new Date().toISOString().slice(0, 10);

    audits.forEach((a) => {
      const isScan = a.action === 'SCAN_VALIDATION';
      const isSuccess = a.resultat === 'SUCCES';

      if (isScan && isSuccess) entreesSortiesOK += 1;
      if (!isSuccess || a.details?.resultatScan === 'REFUSE') refusPassage += 1;
      if (['GENERATION_TITRE', 'DESACTIVATION_TITRE', 'ACTIVATION_TITRE'].includes(a.action)) {
        actionsTitres += 1;
      }

      if (a.createdAt && a.createdAt.slice(0, 10) === today) {
        aujourdhui += 1;
      }
    });

    return {
      total: audits.length,
      entreesSortiesOK,
      refusPassage,
      actionsTitres,
      aujourdhui,
    };
  }, [audits]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (filteredAudits.length === 0) return;
    const headers = [
      'Preuve_ID',
      'Date',
      'Heure',
      'Agent_Nom',
      'Agent_Role',
      'Agent_ID',
      'Voyageur_Nom',
      'Voyageur_ID',
      'Action',
      'Type_Passage',
      'Titre_ID',
      'Code_Scanne',
      'Resultat',
      'Motif_Refus',
      'IP_Borne',
    ];

    const rows = filteredAudits.map((a) => {
      const agent = utilisateurs[a.utilisateurId];
      const voyageurId = a.details?.voyageurId || a.details?.utilisateurId || '';
      const voyageur = voyageurId ? utilisateurs[voyageurId] : null;
      const date = a.createdAt ? a.createdAt.slice(0, 10) : '';
      const heure = a.createdAt ? formatDateTimeFR(a.createdAt).split(' ').slice(-1)[0] : '';
      const agentNom = agent ? `${agent.prenom} ${agent.nom}` : a.utilisateurId;
      const voyNom = voyageur ? `${voyageur.prenom} ${voyageur.nom}` : (voyageurId || 'Inconnu / Non identifié');
      const motif = a.details?.motifRefus || '';
      const typePassage = a.details?.typePassage || (a.action === 'SCAN_VALIDATION' ? 'ENTREE' : 'OPERATION');

      return [
        `"${a.ressourceId || a.id}"`,
        `"${date}"`,
        `"${heure}"`,
        `"${agentNom}"`,
        `"${a.role}"`,
        `"${a.utilisateurId}"`,
        `"${voyNom}"`,
        `"${voyageurId}"`,
        `"${a.action}"`,
        `"${typePassage}"`,
        `"${a.details?.titreId || ''}"`,
        `"${a.details?.codeScanne || ''}"`,
        `"${a.resultat}"`,
        `"${motif}"`,
        `"${a.ipAdresse || ''}"`,
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `preuve_litige_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setSearchParams({});
    setActiveTab('TOUS');
    setActionFilter('');
    setResultatFilter('');
    setDateFilter('');
    setSearch('');
  };

  return (
    <main className="main-content audit-page">
      {/* En-tête */}
      <section className="page-header" style={{ marginBottom: '0.25rem' }}>
        <div>
          <h1 className="page-title">Piste d'audit &amp; Traçabilité des litiges</h1>
          <p className="page-subtitle">
            Journal complet de preuve légale : entrées, sorties, refus de scan, émissions et blocages de titres.
          </p>
        </div>
        <div className="audit-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportCSV}
            disabled={filteredAudits.length === 0}
            title="Télécharger les preuves d'audit au format CSV"
          >
            <span className="material-symbols-outlined">download</span>
            Exporter les preuves (CSV)
          </button>
          <button
            type="button"
            className="dashboard-refresh"
            onClick={loadAudits}
            disabled={loading}
            title="Actualiser la liste"
          >
            <span className={`material-symbols-outlined${loading ? ' spin' : ''}`}>refresh</span>
          </button>
        </div>
      </section>

      {/* Erreur */}
      {error && (
        <div className="offline-notice">
          <span className="material-symbols-outlined offline-icon">error</span>
          <div>
            <div className="offline-title">Erreur de chargement</div>
            <div className="offline-text">{error}</div>
          </div>
          <button type="button" className="btn-secondary" onClick={loadAudits} style={{ marginLeft: 'auto' }}>
            Réessayer
          </button>
        </div>
      )}

      {/* Bandeau de filtre actif */}
      {(urlAction || urlDate || urlResultat || activeTab !== 'TOUS') && (
        <div className="offline-notice" style={{ marginBottom: '0.25rem' }}>
          <span className="material-symbols-outlined offline-icon">filter_alt</span>
          <div>
            <div className="offline-title">
              {activeTab === 'PASSAGES_OK' && 'Vue : Entrées & Passages autorisés uniquement'}
              {activeTab === 'REFUS' && 'Vue : Refus de passage & Incidents de contrôle'}
              {activeTab === 'TITRES' && 'Vue : Opérations sur les titres (émissions / blocages)'}
              {activeTab === 'TOUS' && 'Filtre ciblé appliqué'}
              {urlAction && ` · Action : ${ACTIONS_INFO[urlAction]?.label || urlAction}`}
              {urlResultat && ` · Résultat : ${urlResultat}`}
              {urlDate && ` · Date : ${formatDateFR(urlDate)}`}
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={resetFilters}
          >
            ✕ Réinitialiser
          </button>
        </div>
      )}

      {/* 4 Métriques simples pour les litiges */}
      <section className="audit-kpi-grid">
        <div
          className={`audit-kpi-card audit-kpi--primary${activeTab === 'TOUS' ? ' active-kpi' : ''}`}
          onClick={() => setActiveTab('TOUS')}
          title="Afficher toutes les preuves sans exception"
        >
          <div className="audit-kpi-icon material-symbols-outlined">receipt_long</div>
          <div className="audit-kpi-info">
            <span className="audit-kpi-label">Dossier complet</span>
            <strong className="audit-kpi-val">{metrics.total}</strong>
            <span className="audit-kpi-desc">Totalité des preuves enregistrées</span>
          </div>
        </div>

        <div
          className={`audit-kpi-card audit-kpi--success${activeTab === 'PASSAGES_OK' ? ' active-kpi' : ''}`}
          onClick={() => setActiveTab(activeTab === 'PASSAGES_OK' ? 'TOUS' : 'PASSAGES_OK')}
          title="Filtrer sur les passages et validations autorisés"
        >
          <div className="audit-kpi-icon material-symbols-outlined">login</div>
          <div className="audit-kpi-info">
            <span className="audit-kpi-label">Passages validés</span>
            <strong className="audit-kpi-val">{metrics.entreesSortiesOK}</strong>
            <span className="audit-kpi-desc">Entrées &amp; contrôles en règle</span>
          </div>
        </div>

        <div
          className={`audit-kpi-card audit-kpi--danger${activeTab === 'REFUS' ? ' active-kpi' : ''}`}
          onClick={() => setActiveTab(activeTab === 'REFUS' ? 'TOUS' : 'REFUS')}
          title="Filtrer sur les refus de passage (contestation d'amende/PV)"
        >
          <div className="audit-kpi-icon material-symbols-outlined">gavel</div>
          <div className="audit-kpi-info">
            <span className="audit-kpi-label">Refus &amp; Litiges</span>
            <strong className="audit-kpi-val" style={{ color: metrics.refusPassage > 0 ? '#dc2626' : undefined }}>
              {metrics.refusPassage}
            </strong>
            <span className="audit-kpi-desc">
              {metrics.refusPassage > 0 ? 'Motifs de rejet contestables →' : 'Aucun refus'}
            </span>
          </div>
        </div>

        <div
          className={`audit-kpi-card audit-kpi--amber${activeTab === 'TITRES' ? ' active-kpi' : ''}`}
          onClick={() => setActiveTab(activeTab === 'TITRES' ? 'TOUS' : 'TITRES')}
          title="Filtrer sur les actes d'administration des titres"
        >
          <div className="audit-kpi-icon material-symbols-outlined">admin_panel_settings</div>
          <div className="audit-kpi-info">
            <span className="audit-kpi-label">Gestion des titres</span>
            <strong className="audit-kpi-val">{metrics.actionsTitres}</strong>
            <span className="audit-kpi-desc">Émissions, blocages &amp; réactivations</span>
          </div>
        </div>
      </section>

      {/* Onglets de filtrage rapide de litige */}
      <section className="audit-chips-wrapper">
        <button
          type="button"
          className={`audit-chip${activeTab === 'TOUS' && !actionFilter ? ' active' : ''}`}
          onClick={() => { setActiveTab('TOUS'); setActionFilter(''); }}
        >
          <span>Toutes les preuves</span>
          <span className="audit-chip-count">{audits.length}</span>
        </button>

        <button
          type="button"
          className={`audit-chip${activeTab === 'PASSAGES_OK' ? ' active' : ''}`}
          onClick={() => { setActiveTab('PASSAGES_OK'); setActionFilter(''); }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>login</span>
          <span>Entrées / Passages autorisés</span>
          <span className="audit-chip-count">{metrics.entreesSortiesOK}</span>
        </button>

        <button
          type="button"
          className={`audit-chip audit-chip--danger${activeTab === 'REFUS' ? ' active' : ''}`}
          onClick={() => { setActiveTab('REFUS'); setActionFilter(''); }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>block</span>
          <span>Refus de scan / Incidents</span>
          <span className="audit-chip-count">{metrics.refusPassage}</span>
        </button>

        <button
          type="button"
          className={`audit-chip${activeTab === 'TITRES' ? ' active' : ''}`}
          onClick={() => { setActiveTab('TITRES'); setActionFilter(''); }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>confirmation_number</span>
          <span>Opérations sur les titres</span>
          <span className="audit-chip-count">{metrics.actionsTitres}</span>
        </button>

        <button
          type="button"
          className={`audit-chip${actionFilter === 'DESACTIVATION_TITRE' ? ' active' : ''}`}
          onClick={() => { setActiveTab('TOUS'); setActionFilter(actionFilter === 'DESACTIVATION_TITRE' ? '' : 'DESACTIVATION_TITRE'); }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>lock</span>
          <span>Blocages administratifs</span>
        </button>
      </section>

      {/* Recherche et filtres fins */}
      <section className="filter-toolbar">
        <div className="search-wrapper">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche de litige : nom voyageur, ID titre, référence VAL-..., code TKT-..., agent ou IP..."
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch('')}
              title="Effacer la recherche"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-dropdowns">
          <div className="filter-dropdown-item">
            <label className="filter-label">Nature de l’action</label>
            <select
              className="filter-select"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">Toutes les actions</option>
              {Object.entries(ACTIONS_INFO).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-dropdown-item">
            <label className="filter-label">Résultat</label>
            <select
              className="filter-select"
              value={resultatFilter}
              onChange={(e) => setResultatFilter(e.target.value)}
            >
              <option value="">Tous les résultats</option>
              <option value="SUCCES">Autorisé / Succès</option>
              <option value="ECHEC">Refusé / Échec</option>
            </select>
          </div>

          <div className="filter-dropdown-item">
            <label className="filter-label">Date du contrôle</label>
            <input
              type="date"
              className="form-input"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {(actionFilter || resultatFilter || dateFilter || search || activeTab !== 'TOUS') && (
            <div className="filter-dropdown-item" style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={resetFilters}
                style={{ padding: '0.55rem 1rem' }}
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Tableau des preuves d'audit */}
      <section className="table-card">
        {loading ? (
          <div className="loader-container">
            <span className="page-loader"></span>
            <p className="loader-text">Extraction des preuves d'audit en cours...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-table">
              <thead>
                <tr className="table-header-row">
                  <th className="table-header-th">Date &amp; Heure</th>
                  <th className="table-header-th">Voyageur / Titulaire</th>
                  <th className="table-header-th">Événement de passage</th>
                  <th className="table-header-th">Décision</th>
                  <th className="table-header-th">Contrôleur / Agent</th>
                  <th className="table-header-th">Réf. Preuve</th>
                  <th className="table-header-th">IP Borne</th>
                  <th className="table-header-th-action">Attestation</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.length > 0 ? (
                  filteredAudits.map((a) => {
                    const agent = utilisateurs[a.utilisateurId];
                    const voyageurId = a.details?.voyageurId || a.details?.utilisateurId;
                    const voyageur = voyageurId ? utilisateurs[voyageurId] : null;
                    const isSuccess = a.resultat === 'SUCCES';
                    const info = ACTIONS_INFO[a.action] || { label: a.action, icon: 'receipt_long' };
                    const typePassage = a.details?.typePassage || (a.action === 'SCAN_VALIDATION' ? 'ENTREE' : null);
                    const context = humanContext(a);
                    const refPreuve = a.ressourceId || a.id;

                    return (
                      <tr key={a.id} className="table-row">
                        {/* Date & Heure */}
                        <td className="table-td">
                          <div style={{ fontWeight: 700 }}>{formatDateFR(a.createdAt)}</div>
                          <div className="titre-meta">
                            {formatDateTimeFR(a.createdAt).split(' ').slice(-1)[0]}
                          </div>
                        </td>

                        {/* Voyageur */}
                        <td className="table-td">
                          {voyageur ? (
                            <div>
                              <div style={{ fontWeight: 750, color: 'var(--text-dark)' }}>
                                {voyageur.prenom} {voyageur.nom}
                              </div>
                              <div className="titre-meta">{voyageur.email || voyageurId}</div>
                            </div>
                          ) : voyageurId ? (
                            <div>
                              <div className="titre-meta">Client ID :</div>
                              <div className="audit-copy-id" style={{ fontSize: '0.7rem' }}>
                                {voyageurId.substring(0, 14)}...
                              </div>
                            </div>
                          ) : (
                            <span className="titre-meta">Anonyme / Non identifié</span>
                          )}
                        </td>

                        {/* Événement & Type de passage */}
                        <td className="table-td">
                          <div className="audit-action-cell">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {typePassage && (
                                <span className={`audit-passage-badge audit-passage-badge--${typePassage.toLowerCase()}`}>
                                  {typePassage === 'SORTIE' ? 'Sortie' : 'Entrée'}
                                </span>
                              )}
                              <span className="audit-action-badge">
                                <span className="material-symbols-outlined" style={{ color: info.color }}>
                                  {info.icon}
                                </span>
                                {info.label}
                              </span>
                            </div>
                            <span className={!isSuccess ? 'audit-action-context anomaly' : 'audit-action-context'}>
                              {context}
                            </span>
                          </div>
                        </td>

                        {/* Décision / Résultat */}
                        <td className="table-td">
                          <span
                            className="role-badge"
                            style={{
                              backgroundColor: isSuccess ? '#dcfce7' : '#fee2e2',
                              color: isSuccess ? '#15803d' : '#b91c1c',
                              border: isSuccess ? '1px solid #bbf7d0' : '1px solid #fecaca',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                              {isSuccess ? 'check_circle' : 'cancel'}
                            </span>
                            {isSuccess ? 'Autorisé' : 'Refusé'}
                          </span>
                        </td>

                        {/* Agent contrôleur */}
                        <td className="table-td">
                          <div style={{ fontWeight: 650, color: 'var(--text-dark)' }}>
                            {agent ? `${agent.prenom} ${agent.nom}` : a.utilisateurId?.substring(0, 10)}
                          </div>
                          <span className="role-badge" style={ROLE_COLORS[a.role] || {}}>
                            {a.role}
                          </span>
                        </td>

                        {/* Réf. Preuve */}
                        <td className="table-td">
                          <button
                            type="button"
                            className="audit-copy-id"
                            onClick={() => handleCopy(refPreuve, a.id)}
                            title="Copier la référence légale de preuve"
                          >
                            {refPreuve.length > 18 ? `${refPreuve.substring(0, 14)}...` : refPreuve}
                            <span className="material-symbols-outlined">
                              {copiedId === a.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </td>

                        {/* IP Borne */}
                        <td className="table-td">
                          <span className="titre-meta" style={{ fontFamily: 'var(--font-mono)' }}>
                            {a.ipAdresse ? a.ipAdresse.replace('::ffff:', '') : '127.0.0.1'}
                          </span>
                        </td>

                        {/* Attestation / Preuve */}
                        <td className="table-td-action">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setSelectedAudit(a)}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            title="Ouvrir la fiche de preuve pour litige"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                              verified
                            </span>
                            Preuve
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="table-empty-cell">
                      {search || actionFilter || resultatFilter || dateFilter || activeTab !== 'TOUS'
                        ? 'Aucun enregistrement d’audit ne correspond aux critères de litige recherchés.'
                        : 'Aucune preuve de contrôle ou action enregistrée pour le moment.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Fiche de Preuve Officielle pour Litige */}
      {selectedAudit && (
        <div className="modal-overlay" onClick={() => setSelectedAudit(null)}>
          <div className="modal-container" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="audit-dispute-stamp">Régie des Transports · Preuve Certifiée</span>
                <h2 className="modal-title">Récépissé de Contrôle &amp; Piste d'Audit</h2>
                <p className="modal-subtitle">
                  Réf. légale : <strong>{selectedAudit.ressourceId || selectedAudit.id}</strong>
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedAudit(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Statut officiel du contrôle */}
              <div
                className={`audit-dispute-banner audit-dispute-banner--${selectedAudit.resultat === 'SUCCES' ? 'succes' : 'echec'}`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '28px',
                    color: selectedAudit.resultat === 'SUCCES' ? '#16a34a' : '#dc2626',
                  }}
                >
                  {selectedAudit.resultat === 'SUCCES' ? 'verified' : 'gavel'}
                </span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: selectedAudit.resultat === 'SUCCES' ? '#166534' : '#991b1b' }}>
                    {selectedAudit.resultat === 'SUCCES' ? 'CONTRÔLE AUTORISÉ / PASSAGE ACCORDÉ' : 'CONTRÔLE NON CONFORME / PASSAGE REFUSÉ'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '0.2rem' }}>
                    {humanContext(selectedAudit) || 'Opération enregistrée dans le système de billetterie.'}
                  </div>
                </div>
              </div>

              {/* Détails juridiques et opérationnels */}
              <div className="audit-detail-grid">
                <div className="audit-detail-box">
                  <div className="audit-detail-label">Horodatage officiel (seconde près)</div>
                  <div className="audit-detail-value">
                    {formatDateFR(selectedAudit.createdAt)} à {formatDateTimeFR(selectedAudit.createdAt).split(' ').slice(-1)[0]}
                  </div>
                </div>

                <div className="audit-detail-box">
                  <div className="audit-detail-label">Borne / Terminal IP</div>
                  <div className="audit-detail-value" style={{ fontFamily: 'var(--font-mono)' }}>
                    {selectedAudit.ipAdresse ? selectedAudit.ipAdresse.replace('::ffff:', '') : '127.0.0.1'}
                  </div>
                </div>

                <div className="audit-detail-box">
                  <div className="audit-detail-label">Voyageur / Titulaire du titre</div>
                  <div className="audit-detail-value">
                    {(() => {
                      const voyId = selectedAudit.details?.voyageurId || selectedAudit.details?.utilisateurId;
                      const voy = voyId ? utilisateurs[voyId] : null;
                      if (voy) return `${voy.prenom} ${voy.nom}`;
                      if (voyId) return voyId;
                      return 'Non identifié / Passager anonyme';
                    })()}
                  </div>
                  <div className="titre-meta" style={{ marginTop: '0.2rem' }}>
                    {selectedAudit.details?.voyageurId ? `ID Client : ${selectedAudit.details.voyageurId}` : 'Sans compte rattaché'}
                  </div>
                </div>

                <div className="audit-detail-box">
                  <div className="audit-detail-label">Contrôleur / Opérateur</div>
                  <div className="audit-detail-value">
                    {utilisateurs[selectedAudit.utilisateurId]
                      ? `${utilisateurs[selectedAudit.utilisateurId].prenom} ${utilisateurs[selectedAudit.utilisateurId].nom}`
                      : selectedAudit.utilisateurId}
                  </div>
                  <div className="titre-meta" style={{ marginTop: '0.2rem' }}>
                    Qualité : {selectedAudit.role} (ID: {selectedAudit.utilisateurId})
                  </div>
                </div>

                <div className="audit-detail-box">
                  <div className="audit-detail-label">Titre de transport concerné</div>
                  <div className="audit-detail-value">
                    {selectedAudit.details?.typeTitre || RESSOURCES_LABELS[selectedAudit.ressourceType] || 'Titre de transport'}
                  </div>
                  <div className="titre-meta" style={{ marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                    {selectedAudit.details?.titreId ? `ID Titre : ${selectedAudit.details.titreId}` : (selectedAudit.ressourceId || '—')}
                  </div>
                </div>

                <div className="audit-detail-box">
                  <div className="audit-detail-label">Type de passage / Mouvement</div>
                  <div className="audit-detail-value">
                    {selectedAudit.details?.typePassage === 'SORTIE' ? 'Portillon Sortie' : (selectedAudit.action === 'SCAN_VALIDATION' ? 'Portillon Entrée / Montée' : 'Acte administratif')}
                  </div>
                  <div className="titre-meta" style={{ marginTop: '0.2rem' }}>
                    Action : {ACTIONS_INFO[selectedAudit.action]?.label || selectedAudit.action}
                  </div>
                </div>
              </div>

              {/* Contexte technique intégral (Payload) */}
              <div>
                <div className="audit-detail-label" style={{ marginBottom: '0.35rem' }}>
                  Empreinte technique &amp; Preuve transactionnelle (JSON certifié)
                </div>
                <pre className="audit-json-viewer">
                  {JSON.stringify(
                    {
                      referenceLegale: selectedAudit.ressourceId || selectedAudit.id,
                      action: selectedAudit.action,
                      decision: selectedAudit.resultat,
                      typePassage: selectedAudit.details?.typePassage || 'ENTREE',
                      horodatage: selectedAudit.createdAt,
                      operateur: {
                        id: selectedAudit.utilisateurId,
                        role: selectedAudit.role,
                        ip: selectedAudit.ipAdresse,
                      },
                      voyageur: {
                        id: selectedAudit.details?.voyageurId || selectedAudit.details?.utilisateurId || null,
                      },
                      titre: {
                        titreId: selectedAudit.details?.titreId || null,
                        typeTitre: selectedAudit.details?.typeTitre || null,
                        codeScanne: selectedAudit.details?.codeScanne || null,
                        abonnementId: selectedAudit.details?.abonnementId || null,
                      },
                      incident: selectedAudit.details?.motifRefus || null,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handlePrintReceipt}
                  title="Imprimer l'attestation officielle pour le dossier de litige"
                >
                  <span className="material-symbols-outlined">print</span>
                  Imprimer l'attestation
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleCopy(selectedAudit.ressourceId || selectedAudit.id, 'copy-ref')}
                  title="Copier la référence légale"
                >
                  <span className="material-symbols-outlined">
                    {copiedId === 'copy-ref' ? 'check' : 'content_copy'}
                  </span>
                  {copiedId === 'copy-ref' ? 'Copié' : 'Copier Réf'}
                </button>
                {selectedAudit.details?.titreId && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => navigate(`/titres?recherche=${selectedAudit.details.titreId}`)}
                    title="Consulter la fiche du titre de transport concerné"
                  >
                    <span className="material-symbols-outlined">confirmation_number</span>
                    Voir le titre
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedAudit(null)}
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

export default AuditLogs;
