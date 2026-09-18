import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getStatsAbonnements } from '../services/apiAbonnements';
import { getStatsBilletterie, getAudits } from '../services/apiBilletterie';
import { motifLabel } from '../utils/motifsRefus';
import { formatDateTimeFR } from '../utils/dates';

const STATUS = {
  ACTIF: { label: 'Actifs', color: '#14b87a' },
  SUSPENDU: { label: 'Suspendus', color: '#f59e0b' },
  EXPIRE: { label: 'Expirés', color: '#94a3b8' },
  EPUISE: { label: 'Épuisés', color: '#f05252' },
  RESILIE: { label: 'Résiliés', color: '#64748b' },
};

const TYPE_LABELS = {
  TICKET_SIMPLE: 'Ticket simple',
  LIMITE: 'Voyages limités',
  ILLIMITE: 'Voyages illimités',
};

const ROLE_LABELS = {
  Administrateur: 'Administrateurs',
  Agent: 'Agents',
  Client: 'Clients',
};

const ROLE_COLORS = {
  Administrateur: '#635bff',
  Agent: '#2876da',
  Client: '#9b51e0',
};

const TITLE_STATUS = {
  ACTIF: { label: 'Actifs', color: '#14b87a' },
  DESACTIVE: { label: 'Désactivés', color: '#f05252' },
  CONSOMME: { label: 'Consommés', color: '#94a3b8' },
  EXPIRE: { label: 'Expirés', color: '#f59e0b' },
};

const AUDIT_ACTION_LABELS = {
  GENERATION_TITRE: 'Génération de titre',
  DESACTIVATION_TITRE: 'Désactivation de titre',
  ACTIVATION_TITRE: 'Réactivation de titre',
  SCAN_VALIDATION: 'Scan de validation',
  VALIDATION_MANUELLE: 'Validation manuelle',
};

const AUDIT_ACTION_ICONS = {
  GENERATION_TITRE: 'confirmation_number',
  DESACTIVATION_TITRE: 'block',
  ACTIVATION_TITRE: 'restart_alt',
  SCAN_VALIDATION: 'qr_code_scanner',
  VALIDATION_MANUELLE: 'edit_note',
};

const number = (value) => Number(value || 0).toLocaleString('fr-FR');

function ProgressList({ items, total, emptyText = 'Aucune donnée à afficher.', getLink = null }) {
  const entries = Object.entries(items || {});
  if (!entries.length) return <p className="dashboard-empty">{emptyText}</p>;

  return (
    <div className="dashboard-progress-list">
      {entries.map(([key, item]) => {
        const amount = Number(item.value ?? item.total ?? 0);
        const percent = total ? Math.min(100, Math.round((amount / total) * 100)) : 0;
        const link = getLink ? getLink(key, item) : null;

        const content = (
          <>
            <div className="dashboard-progress-label">
              <span>
                <i style={{ backgroundColor: item.color || '#635bff' }} />
                {item.label || key}
              </span>
              <strong>
                {number(amount)}
                {link && <span className="dashboard-progress-arrow">→</span>}
              </strong>
            </div>
            <div className="dashboard-progress-track">
              <span
                style={{
                  width: `${percent}%`,
                  backgroundColor: item.color || '#635bff',
                }}
              />
            </div>
          </>
        );

        if (link) {
          return (
            <Link
              to={link}
              className="dashboard-progress-item dashboard-progress-item--clickable"
              key={key}
              title={`Filtrer par : ${item.label || key}`}
            >
              {content}
            </Link>
          );
        }

        return (
          <div className="dashboard-progress-item" key={key}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

function AbonnementStats() {
  const navigate = useNavigate();
  const [statsUsers, setStatsUsers] = useState(null);
  const [statsAbo, setStatsAbo] = useState(null);
  const [statsBillet, setStatsBillet] = useState(null);
  const [recentAudits, setRecentAudits] = useState([]);
  const [auteurs, setAuteurs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadStats = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    const [usersRes, aboRes, billetRes, auditRes] = await Promise.allSettled([
      api.getStats(),
      getStatsAbonnements(),
      getStatsBilletterie(),
      getAudits(),
    ]);

    if (usersRes.status === 'fulfilled') setStatsUsers(usersRes.value.stats);
    if (aboRes.status === 'fulfilled') setStatsAbo(aboRes.value.stats);
    if (billetRes.status === 'fulfilled') setStatsBillet(billetRes.value.stats);

    if (auditRes.status === 'fulfilled') {
      const auditsList = (Array.isArray(auditRes.value) ? auditRes.value : []).slice(0, 5);
      setRecentAudits(auditsList);

      const authorIds = [...new Set(auditsList.map((a) => a.utilisateurId).filter(Boolean))];
      if (authorIds.length > 0) {
        try {
          const res = await api.lookupUsers(authorIds);
          const map = {};
          (res.users || []).forEach((u) => {
            map[u.id] = u;
          });
          setAuteurs(map);
        } catch {
          // Erreur non bloquante si le service utilisateurs est temporairement injoignable
        }
      }
    }

    setUpdatedAt(new Date());
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    document.title = 'Tableau de bord — Billetterie Intelligente';
    loadStats();
  }, [loadStats]);

  const validationHours = useMemo(() => {
    return Object.entries(statsBillet?.validationsParHeure || {}).filter(
      ([hour]) => Number(hour) >= 6 && Number(hour) <= 21
    );
  }, [statsBillet]);

  const peak = Math.max(...validationHours.map(([, count]) => Number(count)), 1);
  const activeSubscriptions = statsAbo?.parStatut?.ACTIF || 0;
  const authorizationRate = Number(statsBillet?.tauxSucces ?? 0);

  const todayISO = useMemo(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  // Alertes opérationnelles ciblées ("À surveiller")
  const alerts = useMemo(() => {
    const list = [];
    if (statsAbo?.expirentSous7Jours > 0) {
      list.push({
        level: 'warning',
        icon: 'schedule',
        title: `${number(statsAbo.expirentSous7Jours)} abonnement(s) expirent sous 7 j`,
        description: 'À relancer avant rupture de droit de voyage',
        to: '/abonnements?expireSous=7',
      });
    }
    if (statsUsers?.byStatus?.Bloqué > 0) {
      list.push({
        level: 'danger',
        icon: 'person_off',
        title: `${number(statsUsers.byStatus.Bloqué)} compte(s) bloqué(s)`,
        description: 'Vérifier la situation des comptes utilisateurs',
        to: '/users?status=Bloqu%C3%A9',
      });
    }
    if (statsBillet && statsBillet.totalValidations > 0 && statsBillet.tauxSucces < 90) {
      list.push({
        level: 'danger',
        icon: 'trending_down',
        title: `Taux d’autorisation anormal (${statsBillet.tauxSucces}%)`,
        description: 'Plus de 10% de rejets constatés aux contrôles',
        to: '/validations?resultat=REFUSE',
      });
    }
    if (statsAbo?.parStatut?.EPUISE > 0) {
      list.push({
        level: 'warning',
        icon: 'battery_alert',
        title: `${number(statsAbo.parStatut.EPUISE)} abonnement(s) épuisé(s)`,
        description: 'Voyages consommés : proposer un réapprovisionnement',
        to: '/abonnements?statut=EPUISE',
      });
    }
    if (statsBillet?.titresParStatut?.EXPIRE > 0) {
      list.push({
        level: 'warning',
        icon: 'event_busy',
        title: `${number(statsBillet.titresParStatut.EXPIRE)} titre(s) expiré(s)`,
        description: 'Titres périmés dans le portefeuille client',
        to: '/titres?statut=EXPIRE',
      });
    }
    if (list.length === 0) {
      list.push({
        level: 'ok',
        icon: 'verified',
        title: 'Système nominal',
        description: 'Aucune anomalie ou échéance critique sur le réseau',
        to: '/stats',
      });
    }
    return list;
  }, [statsAbo, statsUsers, statsBillet]);

  const topFormules = useMemo(() => {
    return (statsAbo?.parFormule || []).slice(0, 5);
  }, [statsAbo]);

  const peakRevenuFormule = useMemo(() => {
    return Math.max(...topFormules.map((f) => Number(f.revenu || 0)), 1);
  }, [topFormules]);

  if (isLoading) {
    return (
      <main className="main-content">
        <div className="loader-container">
          <span className="page-loader" />
          <p className="loader-text">Préparation de votre tableau de bord...</p>
        </div>
      </main>
    );
  }

  if (!statsUsers && !statsAbo && !statsBillet) {
    return (
      <main className="main-content">
        <div className="offline-notice">
          <span className="material-symbols-outlined offline-icon">cloud_off</span>
          <div>
            <div className="offline-title">Statistiques indisponibles</div>
            <div className="offline-text">
              Impossible de contacter les services pour récupérer les indicateurs.
            </div>
          </div>
        </div>
      </main>
    );
  }

  const subscriptionStatuses = Object.fromEntries(
    Object.entries(statsAbo?.parStatut || {}).map(([key, value]) => [
      key,
      { value, ...STATUS[key] },
    ])
  );

  const titleStatuses = Object.fromEntries(
    Object.entries(statsBillet?.titresParStatut || {}).map(([key, value]) => [
      key,
      { value, ...TITLE_STATUS[key] },
    ])
  );

  const roles = Object.fromEntries(
    Object.entries(statsUsers?.byRole || {}).map(([key, value]) => [
      key,
      {
        value: value.total,
        label: ROLE_LABELS[key] || key,
        color: ROLE_COLORS[key],
      },
    ])
  );

  return (
    <main className="main-content dashboard-page">
      {/* Barre de pilotage supérieure */}
      <section className="dashboard-topbar">
        <div>
          <p className="dashboard-eyebrow">Centre de pilotage</p>
          <h1 className="page-title">Bonjour, voici l’essentiel.</h1>
          <p className="page-subtitle">
            {today.charAt(0).toUpperCase() + today.slice(1)} · Suivez votre réseau en temps réel.
          </p>
        </div>
        <div className="dashboard-topbar-actions">
          <span className="dashboard-updated">
            <i />
            {updatedAt
              ? `Actualisé à ${updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Mise à jour en cours'}
          </span>
          <button
            type="button"
            className="dashboard-refresh"
            onClick={() => loadStats(true)}
            disabled={isRefreshing}
            aria-label="Actualiser les données"
            title="Actualiser les données"
          >
            <span className={`material-symbols-outlined${isRefreshing ? ' spin' : ''}`}>
              refresh
            </span>
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/abonnements')}
          >
            <span className="material-symbols-outlined btn-icon">add</span>
            Nouvelle souscription
          </button>
        </div>
      </section>

      {/* 4 KPIs Clés — chacun redirige vers sa vue filtrée ciblée */}
      <section className="dashboard-kpis">
        <Link
          to="/users"
          className="dashboard-kpi dashboard-kpi--violet"
          title="Consulter les utilisateurs du réseau"
        >
          <span className="material-symbols-outlined">group</span>
          <div>
            <small>Utilisateurs</small>
            <strong>{number(statsUsers?.total)}</strong>
            <em>Comptes enregistrés <b>→</b></em>
          </div>
        </Link>

        <Link
          to="/abonnements?statut=ACTIF"
          className="dashboard-kpi dashboard-kpi--green"
          title="Afficher uniquement les abonnements actifs"
        >
          <span className="material-symbols-outlined">card_membership</span>
          <div>
            <small>Abonnements actifs</small>
            <strong>{number(activeSubscriptions)}</strong>
            <em>sur {number(statsAbo?.total)} souscriptions <b>→</b></em>
          </div>
        </Link>

        <Link
          to="/titres?statut=ACTIF"
          className="dashboard-kpi dashboard-kpi--blue"
          title="Afficher les titres actifs disponibles"
        >
          <span className="material-symbols-outlined">confirmation_number</span>
          <div>
            <small>Titres émis</small>
            <strong>{number(statsBillet?.totalTitres)}</strong>
            <em>Disponibles à la validation <b>→</b></em>
          </div>
        </Link>

        <Link
          to={`/validations?date=${todayISO}`}
          className="dashboard-kpi dashboard-kpi--amber"
          title="Consulter les scans de la journée"
        >
          <span className="material-symbols-outlined">qr_code_scanner</span>
          <div>
            <small>Scans aujourd’hui</small>
            <strong>{number(statsBillet?.validationsAujourdhui)}</strong>
            <em>{authorizationRate}% d’autorisations <b>→</b></em>
          </div>
        </Link>
      </section>

      {/* Section 1 : Performance des contrôles & Actions rapides / Alertes */}
      <section className="dashboard-overview-grid">
        <article className="dashboard-hero-card">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-card-kicker">Performance des contrôles</p>
              <h2>Validations du jour</h2>
            </div>
            <Link to="/billetterie-stats" title="Consulter toutes les statistiques de billetterie">
              Voir les détails <span>→</span>
            </Link>
          </div>

          <div className="dashboard-authorization">
            <Link
              to={`/validations?resultat=AUTORISE&date=${todayISO}`}
              className="dashboard-ring dashboard-sublink"
              style={{ '--progress': `${authorizationRate * 3.6}deg` }}
              title="Voir les validations autorisées aujourd'hui"
            >
              <div>
                <strong>{authorizationRate}%</strong>
                <span>autorisées</span>
              </div>
            </Link>

            <div>
              <Link
                to={`/validations?resultat=AUTORISE&date=${todayISO}`}
                className="dashboard-sublink"
                title="Voir les validations autorisées aujourd'hui"
              >
                <strong>{number(statsBillet?.autorises)} passages autorisés →</strong>
              </Link>
              <Link
                to="/validations?resultat=REFUSE"
                className="dashboard-sublink dashboard-sublink-danger"
                title="Voir toutes les validations refusées à analyser"
              >
                <p>
                  {number(statsBillet?.refuses)} refus à analyser sur {number(statsBillet?.totalValidations)} contrôles cumulés <b>→</b>
                </p>
              </Link>
              <div className="dashboard-split">
                <span style={{ width: `${authorizationRate}%` }} />
                <i />
              </div>
            </div>
          </div>

          <div className="dashboard-chart">
            <div className="dashboard-chart-title">
              <span>Affluence par heure</span>
              <small>aujourd’hui (6h à 21h) · cliquez sur une barre pour voir les scans</small>
            </div>
            <div className="dashboard-bars">
              {validationHours.map(([hour, count]) => (
                <div
                  className="dashboard-bar-col"
                  key={hour}
                  title={`${hour}h : ${count} validation(s) — Voir les scans de la journée`}
                  onClick={() => navigate(`/validations?date=${todayISO}`)}
                >
                  <span
                    style={{
                      height: `${Math.max(4, (Number(count) / peak) * 100)}%`,
                    }}
                  />
                  <small>{Number(hour) % 3 === 0 ? `${hour}h` : ''}</small>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="dashboard-action-card">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-card-kicker">Actions rapides</p>
              <h2>Gérer le réseau</h2>
            </div>
          </div>

          <button
            type="button"
            className="dashboard-action-btn"
            onClick={() => navigate('/scan')}
          >
            <span className="material-symbols-outlined dashboard-action-icon">qr_code_scanner</span>
            <span>
              <strong>Lancer un scan</strong>
              <small>Valider un titre de transport</small>
            </span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          <button
            type="button"
            className="dashboard-action-btn"
            onClick={() => navigate('/users')}
          >
            <span className="material-symbols-outlined dashboard-action-icon">person_add</span>
            <span>
              <strong>Ajouter un utilisateur</strong>
              <small>Créer un compte client ou agent</small>
            </span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          <button
            type="button"
            className="dashboard-action-btn"
            onClick={() => navigate('/formules')}
          >
            <span className="material-symbols-outlined dashboard-action-icon">receipt_long</span>
            <span>
              <strong>Créer une formule</strong>
              <small>Configurer une offre de voyage</small>
            </span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          {/* Alertes intelligentes opérationnelles */}
          <div className="dashboard-alerts-section">
            {alerts.map((al, idx) => (
              <Link
                key={idx}
                to={al.to}
                className={`dashboard-alert-item dashboard-alert-item--${al.level}`}
              >
                <span className="material-symbols-outlined">{al.icon}</span>
                <div>
                  <strong>{al.title}</strong>
                  <small>{al.description}</small>
                </div>
                {al.to !== '/stats' && (
                  <span className="material-symbols-outlined dashboard-alert-arrow">
                    arrow_forward
                  </span>
                )}
              </Link>
            ))}
          </div>
        </article>
      </section>

      {/* Section 2 : Portefeuille, Titres et Rôles — chaque ligne filtre directement la liste ciblée */}
      <section className="dashboard-insights-grid">
        <article className="dashboard-panel">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-card-kicker">Portefeuille</p>
              <h2>État des abonnements</h2>
            </div>
            <strong className="dashboard-panel-total">{number(statsAbo?.total)}</strong>
          </div>
          <ProgressList
            items={subscriptionStatuses}
            total={statsAbo?.total}
            getLink={(statut) => `/abonnements?statut=${statut}`}
          />
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-card-kicker">Titres de transport</p>
              <h2>Disponibilité des titres</h2>
            </div>
            <strong className="dashboard-panel-total">{number(statsBillet?.totalTitres)}</strong>
          </div>
          <ProgressList
            items={titleStatuses}
            total={statsBillet?.totalTitres}
            getLink={(statut) => `/titres?statut=${statut}`}
          />
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-card-kicker">Communauté</p>
              <h2>Répartition des rôles</h2>
            </div>
            <strong className="dashboard-panel-total">{number(statsUsers?.total)}</strong>
          </div>
          <ProgressList
            items={roles}
            total={statsUsers?.total}
            getLink={(role) => `/users?role=${role}`}
          />
        </article>
      </section>

      {/* Section 3 : Revenus, Types et Rejets */}
      <section className="dashboard-bottom-grid">
        <Link
          to="/abonnements"
          className="dashboard-panel dashboard-revenue dashboard-sublink"
          title="Consulter toutes les souscriptions"
        >
          <div>
            <p className="dashboard-card-kicker">Revenus cumulés</p>
            <strong>
              {number(statsAbo?.revenuTotal)} <small>FCFA</small>
            </strong>
            <p>Montant total issu de toutes les souscriptions enregistrées →</p>
          </div>
          <span className="material-symbols-outlined">payments</span>
        </Link>

        <article className="dashboard-panel">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-card-kicker">Offres souscrites</p>
              <h2>Par type de formule</h2>
            </div>
          </div>
          <div className="dashboard-type-pills">
            {Object.entries(statsAbo?.parType || {}).map(([type, count]) => (
              <Link
                to={`/abonnements?type=${type}`}
                key={type}
                className="dashboard-type-pill-link"
                title={`Afficher les abonnements de type : ${TYPE_LABELS[type] || type}`}
              >
                <span>{TYPE_LABELS[type] || type}</span>
                <strong>{number(count)}</strong>
                <em>Filtrer →</em>
              </Link>
            ))}
          </div>
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-card-kicker">À surveiller</p>
              <h2>Motifs de refus</h2>
            </div>
            <Link to="/validations?resultat=REFUSE" title="Voir toutes les validations refusées">
              Historique refus →
            </Link>
          </div>
          {Object.keys(statsBillet?.refusParMotif || {}).length ? (
            <ProgressList
              items={Object.fromEntries(
                Object.entries(statsBillet.refusParMotif).map(([key, value]) => [
                  key,
                  { value, label: motifLabel(key), color: '#f05252' },
                ])
              )}
              total={statsBillet?.refuses}
              getLink={(motif) => `/validations?resultat=REFUSE&motifRefus=${motif}`}
            />
          ) : (
            <p className="dashboard-empty dashboard-success">
              <span className="material-symbols-outlined">verified</span>
              Aucun refus enregistré.
            </p>
          )}
        </article>
      </section>

      {/* Section 4 : Formules rentables & Activité récente (Piste d'audit) */}
      <section className="dashboard-grid-two">
        {/* Formules les plus performantes */}
        <article className="dashboard-panel">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-card-kicker">Rentabilité</p>
              <h2>Formules les plus performantes</h2>
            </div>
            <Link to="/formules" title="Consulter le catalogue des formules">
              Voir le catalogue →
            </Link>
          </div>

          {topFormules.length === 0 ? (
            <p className="dashboard-empty">Aucune vente enregistrée à ce jour.</p>
          ) : (
            <div className="dashboard-rank-list">
              {topFormules.map((f, i) => (
                <Link
                  to={`/abonnements?type=${f.type}`}
                  key={f.id}
                  className="dashboard-rank-item dashboard-rank-item--clickable"
                  title={`Voir les abonnements ${f.nom}`}
                >
                  <span className="dashboard-rank-badge">{i + 1}</span>
                  <div className="dashboard-rank-info">
                    <div className="dashboard-rank-head">
                      <strong>{f.nom}</strong>
                      <em>{number(f.revenu)} FCFA</em>
                    </div>
                    <div className="dashboard-rank-track">
                      <div
                        className="dashboard-rank-fill"
                        style={{
                          width: `${(Number(f.revenu || 0) / peakRevenuFormule) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="dashboard-rank-meta">
                      {f.ventes} souscription{f.ventes > 1 ? 's' : ''} · {TYPE_LABELS[f.type] || f.type}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>

        {/* Activité récente du réseau (Piste d'audit) */}
        <article className="dashboard-panel">
          <div className="dashboard-card-head">
            <div>
              <p className="dashboard-card-kicker">Sécurité & Flux</p>
              <h2>Activité récente du réseau</h2>
            </div>
            <Link to="/audit" title="Consulter l'ensemble de la piste d'audit">
              Piste d'audit complète →
            </Link>
          </div>

          {recentAudits.length === 0 ? (
            <p className="dashboard-empty">Aucune action récente enregistrée.</p>
          ) : (
            <div className="dashboard-activity-list">
              {recentAudits.map((a) => {
                const auteur = auteurs[a.utilisateurId];
                const isSuccess = a.resultat === 'SUCCES';
                return (
                  <Link
                    to={`/audit?action=${a.action}`}
                    key={a.id}
                    className="dashboard-activity-item dashboard-activity-item--clickable"
                    title={`Filtrer la piste d'audit par action : ${AUDIT_ACTION_LABELS[a.action] || a.action}`}
                  >
                    <span className="material-symbols-outlined dashboard-activity-icon">
                      {AUDIT_ACTION_ICONS[a.action] || 'history'}
                    </span>
                    <div className="dashboard-activity-body">
                      <div className="dashboard-activity-title">
                        <span>{AUDIT_ACTION_LABELS[a.action] || a.action}</span>
                        <span
                          className="dashboard-activity-dot"
                          style={{
                            backgroundColor: isSuccess ? '#14b87a' : '#f05252',
                          }}
                          title={a.resultat}
                        />
                      </div>
                      <div className="dashboard-activity-meta">
                        {auteur ? `${auteur.prenom} ${auteur.nom}` : a.role} ·{' '}
                        {formatDateTimeFR(a.createdAt)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

export default AbonnementStats;
