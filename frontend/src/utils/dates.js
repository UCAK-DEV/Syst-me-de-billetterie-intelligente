// Formate une date (chaîne 'AAAA-MM-JJ', ISO complet, ou objet Date) au
// format français JJ/MM/AAAA, utilisé partout dans l'interface.
export function formatDateFR(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
}

// Formate un horodatage complet (ex: date d'un voyage consommé) en
// JJ/MM/AAAA HH:mm, dans le fuseau horaire du navigateur.
export function formatDateTimeFR(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

// Renvoie l'heure seulement lorsqu'une heure existe réellement dans la valeur
// API. Les anciens champs DATEONLY ne doivent pas devenir artificiellement
// « 00:00 » dans l'interface.
function heureExpirationFR(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

// Les services renvoient parfois un DATEONLY ("2026-09-18"), parfois un
// horodatage ISO complet. On ramène les deux formats à leur jour calendaire
// avant le calcul : concaténer "T00:00:00Z" à un ISO complet produisait une
// date invalide et donc « NaN jour » dans l'interface.
const cleJour = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const joursEntre = (a, b) => {
  const debut = cleJour(a);
  const fin = cleJour(b);
  if (!debut || !fin) return null;
  return Math.round((new Date(`${fin}T00:00:00Z`) - new Date(`${debut}T00:00:00Z`)) / MS_PAR_JOUR);
};

// Durée totale de validité (en jours) entre une date de début et
// d'expiration au format 'AAAA-MM-JJ'.
export function dureeValiditeJours(dateDebut, dateExpiration) {
  if (!dateDebut || !dateExpiration) return null;
  return joursEntre(dateDebut, dateExpiration);
}

// Temps restant avant expiration, à partir d'aujourd'hui, en texte lisible :
// "Expire dans N jours", "Expire aujourd'hui" ou "Expiré depuis N jours".
export function tempsRestant(dateExpiration) {
  if (!dateExpiration) return null;
  const aujourdHui = cleJour(new Date());
  const jours = joursEntre(aujourdHui, dateExpiration);
  if (jours === null) return 'Échéance indisponible';
  const heure = heureExpirationFR(dateExpiration);
  const precisionHeure = heure ? ` à ${heure}` : '';
  if (jours > 0) return `Expire dans ${jours} jour${jours > 1 ? 's' : ''}${precisionHeure}`;
  if (jours === 0) return `Expire aujourd'hui${precisionHeure}`;
  return `Expiré depuis ${Math.abs(jours)} jour${Math.abs(jours) > 1 ? 's' : ''}${precisionHeure}`;
}
