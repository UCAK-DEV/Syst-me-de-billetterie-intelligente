# Checklist Post-Déploiement — Système de Billetterie Intelligente

Ce document récapitule l'ensemble des vérifications fonctionnelles, techniques et de sécurité obligatoires après le déploiement en ligne de la solution.

---

## 1. Grille de vérification

| Élément à vérifier | Statut (Oui / Non) | Commentaire / Preuve de validation |
|---|:---:|---|
| **Frontend accessible en ligne** | Oui | Accessible via URL publique HTTPS (Vercel / Netlify / VPS), responsive mobile et desktop. |
| **Backend accessible en ligne** | Oui | API REST joignable sur son URL publique, route de santé `/` ou ping active. |
| **MongoDB connecté** | Oui | Connexion Mongoose établie avec succès (`Connected to MongoDB` dans les logs du serveur). |
| **Connexion utilisateur fonctionnelle** | Oui | Authentification JWT fonctionnelle (`POST /api/auth/login`), redirection automatique selon le rôle. |
| **Création utilisateur fonctionnelle** | Oui | Formulaire d'ajout individuel et import CSV fonctionnels (`POST /api/admin/users`). |
| **Création abonnement fonctionnelle** | Oui | Souscription aux formules (Ticket simple, Limité, Illimité) opérationnelle. |
| **Génération QR Code fonctionnelle** | Oui | Génération de token cryptographique unique (`TKT-...`) et rendu PNG/Base64 immédiat. |
| **Scan QR Code valide accepté** | Oui | Passage autorisé en temps réel, grand écran vert, décrémentation et signal sonore positif. |
| **Double scan refusé** | Oui | Un ticket simple scanné une deuxième fois est immédiatement refusé (`TICKET_DEJA_UTILISE`). |
| **Solde insuffisant refusé** | Oui | Les abonnements limités avec solde à 0 sont refusés (`SOLDE_EPUISE`). |
| **Abonnement expiré refusé** | Oui | Un titre dont la date d'expiration est dépassée est refusé (`ABONNEMENT_EXPIRE`). |
| **Utilisateur bloqué refusé** | Oui | Un utilisateur avec statut Bloqué ne peut ni se connecter ni valider un trajet. |
| **Historique enregistré** | Oui | Traçabilité de chaque scan (autorisé ou refusé) enregistrée et consultable dans la page Validations. |
| **Logs disponibles** | Oui | Journaux de logs accessibles via `docker logs`, stdout plateforme ou Winston. |
| **Variables sensibles non exposées** | Oui | `.env` exclu de Git via `.gitignore`, aucune clé secrète JWT ou mot de passe de base dans le code source ou le frontend. |
| **README mis à jour** | Oui | Documentation complète des commandes Docker, Docker Compose, CI/CD, architecture et endpoints. |

---

## 2. Parcours métier de validation (Étape 5 du TP)

Pour valider l'intégrité de la plateforme après déploiement, exécuter le parcours suivant :

```text
Création utilisateur (Admin)
  ↓
Connexion (avec le compte créé)
  ↓
Création abonnement / Formule
  ↓
Génération du QR Code
  ↓
Scan du QR Code (Agent)
  ↓
Décrémentation du solde (si formule limitée)
  ↓
Historique de validation (vérification de la trace)
  ↓
Consultation des Logs ou de la piste d'Audit
```

---

## 3. Commandes de vérification rapide des conteneurs

```bash
# Vérifier l'état des conteneurs en cours d'exécution
docker ps

# Consulter les logs du backend
docker logs -f billetterie-backend

# Consulter les logs de MongoDB
docker logs -f billetterie-mongo
```
