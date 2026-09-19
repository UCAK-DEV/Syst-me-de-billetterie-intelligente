/**
 * Jeu de données et mécanismes de repli Mock pour les comptes de test et la démo en direct.
 * Permet un fonctionnement transparent même sans serveur backend actif (ex: Vercel SPA ou hors-ligne).
 */

export const MOCK_USERS = {
  'admin@billetterie.com': {
    id: '6aae9a6aec9f07c8d77c5075',
    nom: 'Ndiaye',
    prenom: 'Ousmane',
    email: 'admin@billetterie.com',
    role: 'Administrateur',
    telephone: '+221 70 890 12 34',
    status: 'Actif',
    mustChangePassword: false,
  },
  'admin@billeterie.com': {
    id: '6aae9a6aec9f07c8d77c507a',
    nom: 'Ndiaye',
    prenom: 'Ousmane',
    email: 'admin@billeterie.com',
    role: 'Administrateur',
    telephone: '+221 70 890 12 34',
    status: 'Actif',
    mustChangePassword: false,
  },
  'agent@billetterie.com': {
    id: '6aae9a6aec9f07c8d77c507d',
    nom: 'Diallo',
    prenom: 'Amadou',
    email: 'agent@billetterie.com',
    role: 'Agent',
    telephone: '+221 78 230 45 67',
    status: 'Actif',
    mustChangePassword: false,
  },
  'client@billetterie.com': {
    id: '6aae9a6aec9f07c8d77c5080',
    nom: 'Sow',
    prenom: 'Moussa',
    email: 'client@billetterie.com',
    role: 'Client',
    telephone: '+221 77 654 32 10',
    status: 'Actif',
    mustChangePassword: false,
  },
};

export const MOCK_CLIENT_TITRES = [
  {
    id: 'titre-mock-1',
    codeUnique: 'TCK-TER-2026-9104',
    typeTitre: 'TICKET_SIMPLE',
    statut: 'ACTIF',
    dateCreation: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    dateExpiration: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
    utilisateurId: '6aae9a6aec9f07c8d77c5080',
  },
  {
    id: 'titre-mock-2',
    codeUnique: 'ABO-DDD-2026-4412',
    typeTitre: 'LIMITE',
    statut: 'ACTIF',
    dateCreation: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    dateExpiration: new Date(Date.now() + 26 * 24 * 3600 * 1000).toISOString(),
    abonnementId: 9,
    utilisateurId: '6aae9a6aec9f07c8d77c5080',
  },
  {
    id: 'titre-mock-3',
    codeUnique: 'TCK-BRT-2026-3382',
    typeTitre: 'TICKET_SIMPLE',
    statut: 'ACTIF',
    dateCreation: new Date().toISOString(),
    dateExpiration: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    utilisateurId: '6aae9a6aec9f07c8d77c5080',
  },
  {
    id: 'titre-mock-4',
    codeUnique: 'TCK-SN-2026-0042',
    typeTitre: 'TICKET_SIMPLE',
    statut: 'CONSOMME',
    dateCreation: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    consommeLe: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    utilisateurId: '6aae9a6aec9f07c8d77c5080',
  },
  {
    id: 'titre-mock-5',
    codeUnique: 'PAS-SN-2026-0819',
    typeTitre: 'LIMITE',
    statut: 'EXPIRE',
    dateCreation: new Date(Date.now() - 35 * 24 * 3600 * 1000).toISOString(),
    dateExpiration: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    abonnementId: 7,
    utilisateurId: '6aae9a6aec9f07c8d77c5080',
  },
];

export const MOCK_VALIDITE = {
  valide: true,
  abonnement: {
    id: 9,
    formuleNom: 'Mensuel 20 voyages',
    voyagesAutorises: 20,
    voyagesConsommes: 3,
    voyagesRestants: 17,
    dateExpiration: new Date(Date.now() + 26 * 24 * 3600 * 1000).toISOString(),
    statut: 'ACTIF',
  },
};

export const MOCK_FORMULES = [
  { id: 1, nom: 'Ticket simple', description: 'Un voyage immédiat', type: 'TICKET_SIMPLE', tarif: 500, dureeValiditeJours: 1, nombreVoyages: 1 },
  { id: 2, nom: 'Carnet 10 voyages', description: '10 trajets urbains', type: 'LIMITE', tarif: 4500, dureeValiditeJours: 60, nombreVoyages: 10 },
  { id: 3, nom: 'Mensuel 20 voyages', description: '20 trajets sur 30 jours', type: 'LIMITE', tarif: 15000, dureeValiditeJours: 30, nombreVoyages: 20 },
  { id: 4, nom: 'Mensuel 40 voyages', description: '40 trajets quotidiens', type: 'LIMITE', tarif: 28000, dureeValiditeJours: 30, nombreVoyages: 40 },
  { id: 5, nom: 'Illimité mensuel', description: 'Voyages illimités 30 jours', type: 'ILLIMITE', tarif: 50000, dureeValiditeJours: 30, nombreVoyages: null },
  { id: 6, nom: 'Illimité annuel', description: 'Pass annuel réseau complet', type: 'ILLIMITE', tarif: 500000, dureeValiditeJours: 365, nombreVoyages: null },
];

export const MOCK_VALIDATIONS_HISTORY = [
  {
    id: 'VAL-DEMO-001',
    codeScanne: 'TCK-TER-2026-9104',
    resultat: 'AUTORISE',
    motifRefus: null,
    dateValidation: new Date().toISOString().split('T')[0],
    heureValidation: '08:45:12',
    agentId: '6aae9a6aec9f07c8d77c507d',
    utilisateurId: '6aae9a6aec9f07c8d77c5080',
  },
  {
    id: 'VAL-DEMO-002',
    codeScanne: 'ABO-DDD-2026-4412',
    resultat: 'AUTORISE',
    motifRefus: null,
    dateValidation: new Date().toISOString().split('T')[0],
    heureValidation: '11:05:42',
    agentId: '6aae9a6aec9f07c8d77c507d',
    utilisateurId: '6aae9a6aec9f07c8d77c5080',
  },
  {
    id: 'VAL-DEMO-003',
    codeScanne: 'TCK-SN-2026-0042',
    resultat: 'REFUSE',
    motifRefus: 'TICKET_DEJA_UTILISE',
    dateValidation: new Date().toISOString().split('T')[0],
    heureValidation: '14:20:19',
    agentId: '6aae9a6aec9f07c8d77c507d',
    utilisateurId: '6aae9a6aec9f07c8d77c5080',
  },
];

export function mockValidateCode(code) {
  const clean = String(code || '').trim();
  if (!clean) {
    return { autorise: false, motifRefus: 'QR_CODE_INCONNU', message: 'Aucun code fourni' };
  }

  if (clean.includes('0042') || clean.toUpperCase().includes('CONSOMME') || clean.toUpperCase().includes('DEJA')) {
    return {
      autorise: false,
      motifRefus: 'TICKET_DEJA_UTILISE',
      message: 'Ce ticket a déjà été consommé lors d\'un précédent contrôle.',
      validation: { id: `VAL-MOCK-${Date.now()}`, heureValidation: new Date().toLocaleTimeString() },
    };
  }

  if (clean.includes('0819') || clean.toUpperCase().includes('EXPIRE') || clean.toUpperCase().includes('EXP')) {
    return {
      autorise: false,
      motifRefus: 'ABONNEMENT_EXPIRE',
      message: 'La période de validité de ce titre est expirée.',
      validation: { id: `VAL-MOCK-${Date.now()}`, heureValidation: new Date().toLocaleTimeString() },
    };
  }

  if (clean.toUpperCase().includes('SUSPENDU')) {
    return {
      autorise: false,
      motifRefus: 'ABONNEMENT_SUSPENDU',
      message: 'Titre suspendu temporairement par l\'administrateur.',
      validation: { id: `VAL-MOCK-${Date.now()}`, heureValidation: new Date().toLocaleTimeString() },
    };
  }

  // Code valide reconnu (TICKET ou ABO)
  const isAbo = clean.includes('ABO') || clean.includes('4412');
  return {
    autorise: true,
    message: isAbo ? 'Abonnement actif · Décompte effectué' : 'Ticket simple valide · Bon voyage !',
    titre: {
      typeTitre: isAbo ? 'LIMITE' : 'TICKET_SIMPLE',
    },
    abonnement: isAbo ? { voyagesRestants: 17, dateExpiration: '2026-12-31' } : null,
    validation: {
      id: `VAL-MOCK-${Date.now()}`,
      heureValidation: new Date().toLocaleTimeString(),
    },
  };
}
