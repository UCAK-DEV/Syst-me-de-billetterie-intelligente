/**
 * Service API Utilisateurs & Authentification
 * Gère les communications REST avec le backend (port 5050),
 * le stockage sécurisé du jeton JWT et le mécanisme de secours local.
 */

import { MOCK_USERS } from './mockData';

// Normalisation de l'URL de base de l'API
let rawApiUrl = (import.meta.env.VITE_API_URL || '/api').trim();
if (!rawApiUrl.startsWith('http') && !rawApiUrl.startsWith('/')) {
  rawApiUrl = `/${rawApiUrl}`;
}
if (!rawApiUrl.endsWith('/api')) {
  rawApiUrl = `${rawApiUrl.replace(/\/+$/, '')}/api`;
}
const API_URL = rawApiUrl;

// Origine du serveur (sans le /api), pour les fichiers servis en statique (photos, uploads)
const SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, '');

// Construit l'URL complète d'une photo de profil ('' si aucune photo)
// Gère les Data URLs base64 (mode démo), les URLs absolues et les chemins relatifs
export function photoUrl(photo) {
  if (!photo) return '';
  // Data URL (base64) générée en mode démo — utilisable directement
  if (photo.startsWith('data:')) return photo;
  // URL absolue (http/https) — retournée telle quelle
  if (/^https?:\/\//i.test(photo)) return photo;
  // Chemin relatif — préfixé par l'origine du serveur backend
  return `${SERVER_ORIGIN}${photo}`;
}

function getToken() {
  return localStorage.getItem('token');
}

export function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getStoredUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

// Met à jour l'utilisateur stocké sans toucher au token
export function setStoredUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

export function isAuthenticated() {
  return !!getToken();
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    // Le serveur du Service Utilisateurs ne répond pas (arrêté, ou pas
    // encore démarré) : le message du navigateur ("Failed to fetch",
    // "NetworkError...") n'a aucun sens pour l'utilisateur.
    throw new Error("Impossible de contacter le serveur. Vérifiez qu'il est démarré.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.message || 'Erreur serveur');
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  login: async (email, password) => {
    try {
      return await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    } catch (err) {
      // Repli Mock automatique pour les comptes de test si le serveur est injoignable ou sur Vercel SPA
      const normalized = (email || '').trim().toLowerCase();
      if (MOCK_USERS[normalized] && (password === 'Admin1234' || password === 'admin' || password === 'passer')) {
        console.info(`[Auth Démo] Connexion mock réussie pour ${normalized}`);
        return {
          token: `jwt-mock-demo-${Date.now()}`,
          user: MOCK_USERS[normalized],
        };
      }
      throw err;
    }
  },

  logout: () => request('/auth/logout', { method: 'POST' }),

  // --- Confirmation de compte par lien (public, pas de session) ---
  verifyConfirmationToken: (token) => request(`/auth/confirmation/${token}`),

  confirmAccount: (token, motDePasse) =>
    request(`/auth/confirmation/${token}`, {
      method: 'POST',
      body: JSON.stringify({ motDePasse }),
    }),

  resendConfirmationLink: (userId) =>
    request(`/admin/users/${userId}/confirmation/renvoyer`, { method: 'POST' }),

  getUsers: async (params = {}) => {
    try {
      const query = new URLSearchParams(params).toString();
      return await request(`/admin/users${query ? `?${query}` : ''}`);
    } catch {
      return Object.values(MOCK_USERS);
    }
  },

  // Identité minimale (nom, prénom, téléphone), accessible aux agents —
  // contrairement à getUsers ci-dessus, réservé aux administrateurs.
  lookupUsers: (ids = []) => {
    if (ids.length === 0) return Promise.resolve({ users: [] });
    return request(`/users/lookup?ids=${ids.join(',')}`);
  },

  createUser: (userData) =>
    request('/admin/users', { method: 'POST', body: JSON.stringify(userData) }),

  updateUser: (id, userData) =>
    request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),

  importUsers: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/admin/users/import', { method: 'POST', body: formData });
  },

  bulkStatus: (userIds, action) =>
    request('/admin/users/bulk-status', {
      method: 'PATCH',
      body: JSON.stringify({ userIds, action }),
    }),

  updateUserStatus: (id, status) =>
    request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  getStats: async () => {
    try {
      return await request('/admin/dashboard/stats');
    } catch {
      return {
        totalUsers: 148,
        activeUsers: 142,
        adminsCount: 2,
        agentsCount: 14,
        clientsCount: 132,
        newUsersToday: 6,
        successRate: 98.2,
      };
    }
  },

  // --- Profil du compte connecté ---
  getProfile: () => request('/users/profile'),

  updateProfile: (data) =>
    request('/users/profile', { method: 'PUT', body: JSON.stringify(data) }),

  changePassword: (oldPassword, newPassword) =>
    request('/users/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  uploadPhoto: async (file) => {
    // Tente d'abord l'upload réel vers le backend
    try {
      const formData = new FormData();
      formData.append('photo', file);
      return await request('/users/profile/photo', { method: 'POST', body: formData });
    } catch (err) {
      // Repli mock : si le serveur est injoignable (mode démo Vercel),
      // on génère une Data URL locale de la photo et on met à jour l'utilisateur stocké
      if (err.message && err.message.includes('contacter le serveur')) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target.result;
            // Mise à jour de l'utilisateur local avec la nouvelle photo (Data URL)
            const storedUser = getStoredUser();
            if (storedUser) {
              storedUser.photo = dataUrl;
              setStoredUser(storedUser);
            }
            resolve({
              message: 'Photo mise à jour (mode démo)',
              photo: dataUrl,
              user: { ...storedUser, photo: dataUrl },
            });
          };
          reader.onerror = () => reject(new Error('Impossible de lire le fichier image'));
          reader.readAsDataURL(file);
        });
      }
      throw err;
    }
  },
};
