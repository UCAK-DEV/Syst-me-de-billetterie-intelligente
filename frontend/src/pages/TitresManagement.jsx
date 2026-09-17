import React, { useState, useEffect, useCallback } from 'react';
import { getTitres, changerStatutTitre } from '../services/apiBilletterie';
import { api, getStoredUser } from '../services/api';
import CreateTitreModal from '../components/CreateTitreModal';
import ViewQrModal from '../components/ViewQrModal';
import ConfirmDialog from '../components/ConfirmDialog';

const TYPE_LABELS = {
  TICKET_SIMPLE: 'Ticket simple',
  LIMITE: 'Abonnement limité',
  ILLIMITE: 'Abonnement illimité',
};

const TYPE_COLORS = {
  TICKET_SIMPLE: { backgroundColor: '#eff6ff', color: '#1e40af' },
  LIMITE: { backgroundColor: '#faf5ff', color: '#6b21a8' },
  ILLIMITE: { backgroundColor: '#f0fdf4', color: '#166534' },
};

const STATUT_COLORS = {
  ACTIF: { backgroundColor: '#dcfce7', color: '#15803d' },
  DESACTIVE: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  CONSOMME: { backgroundColor: '#f1f5f9', color: '#475569' },
  EXPIRE: { backgroundColor: '#fef3c7', color: '#92400e' },
};

function TitresManagement() {
  const [titres, setTitres] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Filtres
  const [statutFilter, setStatutFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTitreForQr, setSelectedTitreForQr] = useState(null);

  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === 'Administrateur';

  const loadTitres = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTitres({
        statut: statutFilter,
        typeTitre: typeFilter,
        recherche: search,
      });
      const list = Array.isArray(data) ? data : [];
      setTitres(list);

      // Identité lisible des clients concernés — accessible aux agents,
      // contrairement à la liste complète des comptes (réservée aux admins).
      const ids = [...new Set(list.map((t) => t.utilisateurId))];
      if (ids.length > 0) {
        api.lookupUsers(ids)
          .then((res) => {
            const map = {};
            (res.users || []).forEach((c) => { map[c.id] = c; });
            setClients(map);
          })
          .catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des titres');
    } finally {
      setLoading(false);
    }
  }, [statutFilter, typeFilter, search]);

  useEffect(() => {
    loadTitres();
  }, [loadTitres]);

  const handleToggleStatut = (titre) => {
    const activer = titre.statut !== 'ACTIF';
    setConfirmDialog({
      title: activer ? 'Activer ce titre ?' : 'Désactiver ce titre ?',
      message: activer
        ? 'Le client pourra de nouveau utiliser ce titre pour voyager.'
        : 'Le client ne pourra plus utiliser ce titre tant qu\'il n\'est pas réactivé.',
      confirmLabel: activer ? 'Activer' : 'Désactiver',
      danger: !activer,
      onConfirm: async () => {
        try {
          await changerStatutTitre(titre.id, activer ? 'ACTIF' : 'DESACTIVE');
          loadTitres();
        } catch (err) {
          setError(err.message || 'Erreur lors du changement de statut');
        }
      },
    });
  };

  return (
    <main className="main-content">
      <section className="page-header">
        <div>
          <h1 className="page-title">Titres de transport</h1>
          <p className="page-subtitle">Génération, cycle de vie et consultation des QR Codes</p>
        </div>

        {isAdmin && (
          <button type="button" className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <span className="material-symbols-outlined btn-icon">add</span>
            Générer un titre
          </button>
        )}
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

      <section className="filter-toolbar">
        <div className="search-wrapper">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par code QR ou ID client..."
          />
        </div>

        <div className="filter-dropdowns">
          <div className="filter-dropdown-item">
            <label className="filter-label">Type</label>
            <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Tous les types</option>
              <option value="TICKET_SIMPLE">Ticket simple</option>
              <option value="LIMITE">Abonnement limité</option>
              <option value="ILLIMITE">Abonnement illimité</option>
            </select>
          </div>

          <div className="filter-dropdown-item">
            <label className="filter-label">Statut</label>
            <select className="filter-select" value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option value="ACTIF">Actif</option>
              <option value="DESACTIVE">Désactivé</option>
              <option value="CONSOMME">Consommé</option>
              <option value="EXPIRE">Expiré</option>
            </select>
          </div>
        </div>
      </section>

      <section className="table-card">
        {loading ? (
          <div className="loader-container">
            <span className="page-loader"></span>
            <p className="loader-text">Chargement des titres...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="user-table">
              <thead>
                <tr className="table-header-row">
                  <th className="table-header-th">QR Code</th>
                  <th className="table-header-th">Client</th>
                  <th className="table-header-th">Type</th>
                  <th className="table-header-th">Expiration</th>
                  <th className="table-header-th">Statut</th>
                  <th className="table-header-th-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {titres.length > 0 ? (
                  titres.map((t) => {
                    const client = clients[t.utilisateurId];
                    return (
                      <tr key={t.id} className="table-row">
                        <td className="table-td-user">
                          <img src={t.qrCodeData} alt="" className="titre-qr-thumb" />
                          <div>
                            <div className="table-td-id">{t.codeUnique}</div>
                            <div className="titre-meta">
                              Créé le {new Date(t.dateCreation || t.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="table-td">
                          {client ? (
                            <div>
                              <div>{client.prenom} {client.nom}</div>
                              <div className="titre-meta">{client.telephone}</div>
                            </div>
                          ) : (
                            <span className="table-td-id">{t.utilisateurId.substring(0, 10)}...</span>
                          )}
                        </td>
                        <td className="table-td">
                          <span className="role-badge" style={TYPE_COLORS[t.typeTitre]}>
                            {TYPE_LABELS[t.typeTitre] || t.typeTitre}
                          </span>
                        </td>
                        <td className="table-td">
                          {t.dateExpiration || <span className="titre-meta">Illimitée</span>}
                        </td>
                        <td className="table-td">
                          <span className="role-badge" style={STATUT_COLORS[t.statut]}>
                            {t.statut}
                          </span>
                        </td>
                        <td className="table-td-action">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Voir et imprimer le QR Code"
                            onClick={() => setSelectedTitreForQr(t)}
                          >
                            <span className="material-symbols-outlined">qr_code</span>
                          </button>

                          {isAdmin && (t.statut === 'ACTIF' || t.statut === 'DESACTIVE') && (
                            <button
                              type="button"
                              className="icon-btn"
                              title={t.statut === 'ACTIF' ? 'Désactiver le titre' : 'Activer le titre'}
                              onClick={() => handleToggleStatut(t)}
                            >
                              <span className="material-symbols-outlined">
                                {t.statut === 'ACTIF' ? 'block' : 'check_circle'}
                              </span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="table-empty-cell">
                      {search || typeFilter || statutFilter
                        ? 'Aucun titre ne correspond à ces critères.'
                        : isAdmin
                          ? 'Aucun titre généré pour l\'instant — cliquez sur "Générer un titre" pour créer le premier.'
                          : 'Aucun titre généré pour l\'instant.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreateModal && (
        <CreateTitreModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={(nouveauTitre) => {
            loadTitres();
            setSelectedTitreForQr(nouveauTitre);
          }}
        />
      )}

      {selectedTitreForQr && (
        <ViewQrModal
          titre={selectedTitreForQr}
          client={clients[selectedTitreForQr.utilisateurId]}
          onClose={() => setSelectedTitreForQr(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        danger={confirmDialog?.danger}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          confirmDialog?.onConfirm();
          setConfirmDialog(null);
        }}
      />
    </main>
  );
}

export default TitresManagement;
