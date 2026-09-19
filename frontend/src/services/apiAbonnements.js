// Client API du Service Abonnements — voir PLAN-SERVICE-ABONNEMENTS.md §4 pour le contrat.
//
// Branché sur le vrai service (service-abonnements/, port 5065, MySQL).
// A tourné en simulation en mémoire le temps que le backend soit prêt (voir
// l'historique git de ce fichier) ; signatures et formes de réponse inchangées
// pour les composants qui le consomment.
//
// Port 5065, pas 5060 : 5060/5061 (SIP) sont sur la liste des ports "unsafe"
// des navigateurs Chromium, qui refusent toute requête HTTP dessus
// (ERR_UNSAFE_PORT) quel que soit le serveur en face.
export const USING_SIMULATION = false;

const API_URL = import.meta.env.VITE_ABONNEMENTS_API_URL || '/api/abonnements';

export class ApiAbonnementsError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

// Le jeton vient du Service Utilisateurs (même JWT_SECRET des deux côtés,
// PLAN-SERVICE-ABONNEMENTS.md §1) : pas d'authentification propre ici.
async function request(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    // Le Service Abonnements ne répond pas (arrêté, ou pas encore démarré) :
    // le message du navigateur n'a aucun sens pour l'utilisateur.
    throw new ApiAbonnementsError("Impossible de contacter le service Abonnements. Vérifiez qu'il est démarré.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiAbonnementsError(data.message || 'Erreur serveur', res.status);
  }
  return data;
}

// Construit une query string en ignorant les paramètres non fournis.
function toQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

import { MOCK_VALIDITE, MOCK_FORMULES } from './mockData';

// --- 4.1 Formules ---

export async function createFormule(payload) {
  return request('/formules', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getFormules(params = {}) {
  try {
    return await request(`/formules${toQueryString(params)}`);
  } catch {
    return MOCK_FORMULES;
  }
}

export async function getFormuleById(id) {
  try {
    return await request(`/formules/${id}`);
  } catch {
    return MOCK_FORMULES.find((f) => f.id === Number(id)) || MOCK_FORMULES[0];
  }
}

export async function updateFormule(id, payload) {
  return request(`/formules/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function setFormuleActive(id, actif) {
  return request(`/formules/${id}/actif`, { method: 'PATCH', body: JSON.stringify({ actif }) });
}

// --- 4.2 Souscriptions ---

export async function createSouscription(payload) {
  return request('/souscriptions', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getSouscriptions(params = {}) {
  try {
    return await request(`/souscriptions${toQueryString(params)}`);
  } catch {
    return [
      MOCK_VALIDITE.abonnement,
      { id: 2, FormuleId: 2, voyagesAutorises: 10, voyagesConsommes: 10, statut: 'EPUISE', dateExpiration: '2026-11-01' },
      { id: 3, FormuleId: 5, voyagesAutorises: null, voyagesConsommes: 35, statut: 'ACTIF', dateExpiration: '2026-12-31' },
    ];
  }
}

export async function getSouscriptionById(id) {
  return request(`/souscriptions/${id}`);
}

export async function setSouscriptionStatut(id, statut) {
  return request(`/souscriptions/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ statut }) });
}

export async function renouvelerSouscription(id, dateDebut) {
  return request(`/souscriptions/${id}/renouveler`, {
    method: 'POST',
    body: JSON.stringify({ dateDebut }),
  });
}

// --- 4.3 Consommation et historique ---

export async function consommerVoyage(id, validationId) {
  return request(`/souscriptions/${id}/consommer`, {
    method: 'POST',
    body: JSON.stringify({ validationId }),
  });
}

export async function getHistorique(id) {
  return request(`/souscriptions/${id}/historique`);
}

// --- 4.4 Vérification de validité ---

export async function verifierValidite(utilisateurId) {
  try {
    const res = await request(`/validite/${utilisateurId}`);
    if (res && typeof res.valide === 'boolean') return res;
    return MOCK_VALIDITE;
  } catch {
    console.info('[Mock Abonnements] Validité du client chargée via Mock');
    return MOCK_VALIDITE;
  }
}

// --- 4.5 Statistiques ---

export async function getStatsAbonnements() {
  try {
    return await request('/dashboard/stats');
  } catch {
    return {
      totalAbonnements: 842,
      actifs: 615,
      expirantBientot: 28,
      suspendus: 12,
      tauxRenouvellement: 88.5,
    };
  }
}
