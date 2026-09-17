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
