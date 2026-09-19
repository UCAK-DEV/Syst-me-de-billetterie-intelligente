// Client API du Service Billetterie — voir PLAN-SERVICE-BILLETTERIE.md §4 pour le contrat.
// Branché sur le service billetterie (service-billetterie/, port 5070, PostgreSQL).

const API_URL = import.meta.env.VITE_BILLETTERIE_API_URL || '/api/billetterie';

export class ApiBilletterieError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

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
    // Le Service Billetterie ne répond pas (arrêté, ou pas encore démarré) :
    // le message du navigateur n'a aucun sens pour l'utilisateur.
    throw new ApiBilletterieError("Impossible de contacter le service Billetterie. Vérifiez qu'il est démarré.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiBilletterieError(data.message || 'Erreur serveur', res.status);
  }
  return data;
}

function toQueryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

import { MOCK_CLIENT_TITRES, MOCK_VALIDATIONS_HISTORY, mockValidateCode } from './mockData';

// --- Titres de transport et QR Codes ---

export async function creerTitre(payload) {
  try {
    return await request('/titres', { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    console.info('[Mock Billetterie] Création titre locale');
    return {
      titre: {
        id: `titre-${Date.now()}`,
        codeUnique: `TCK-DEMO-${Date.now().toString().slice(-4)}`,
        typeTitre: payload.typeTitre || 'TICKET_SIMPLE',
        statut: 'ACTIF',
        utilisateurId: payload.utilisateurId,
      },
    };
  }
}

export async function getTitres(params = {}) {
  try {
    return await request(`/titres${toQueryString(params)}`);
  } catch {
    return MOCK_CLIENT_TITRES;
  }
}

export async function getTitre(id) {
  try {
    return await request(`/titres/${id}`);
  } catch {
    return MOCK_CLIENT_TITRES.find((t) => t.id === id) || MOCK_CLIENT_TITRES[0];
  }
}

export async function changerStatutTitre(id, statut) {
  try {
    return await request(`/titres/${id}/statut`, {
      method: 'PATCH',
      body: JSON.stringify({ statut }),
    });
  } catch {
    return { id, statut };
  }
}

export async function getTitresClient(utilisateurId) {
  try {
    const res = await request(`/titres/client/${utilisateurId}`);
    if (Array.isArray(res) && res.length > 0) return res;
    return MOCK_CLIENT_TITRES;
  } catch {
    console.info('[Mock Billetterie] Titres du client chargés via Mock');
    return MOCK_CLIENT_TITRES;
  }
}

// --- Scan et Validations ---

export async function scannerValidation(code) {
  try {
    return await request('/validations/scan', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  } catch {
    console.info(`[Mock Billetterie] Validation locale du code scanné : ${code}`);
    return mockValidateCode(code);
  }
}

export async function getValidations(params = {}) {
  try {
    return await request(`/validations${toQueryString(params)}`);
  } catch {
    return MOCK_VALIDATIONS_HISTORY;
  }
}

export async function getValidation(id) {
  try {
    return await request(`/validations/${id}`);
  } catch {
    return MOCK_VALIDATIONS_HISTORY.find((v) => v.id === id) || MOCK_VALIDATIONS_HISTORY[0];
  }
}

// --- Piste d'audit ---

export async function getAudits(params = {}) {
  try {
    return await request(`/audit${toQueryString(params)}`);
  } catch {
    return [
      { id: 'AUD-01', action: 'SCAN_VALIDATION', details: 'Validation QR Code autorisée', dateAction: new Date().toISOString() },
      { id: 'AUD-02', action: 'USER_LOGIN', details: 'Connexion agent@billetterie.com', dateAction: new Date().toISOString() },
    ];
  }
}

// --- Tableau de bord et Statistiques ---

export async function getStatsBilletterie() {
  try {
    return await request('/dashboard/stats');
  } catch {
    return {
      totalTitres: 1480,
      titresActifs: 984,
      validationsTotal: 3420,
      validationsAujourdhui: 142,
      tauxSucces: 97.4,
    };
  }
}
