# Système de billetterie intelligente
> **Université Cheikh Ahmadoul Khadim (UCAK) de Touba**  
> Projet intégrateur de Billetterie & Transport multi-services  
> **Application en direct :** [https://sunuticket.vercel.app](https://sunuticket.vercel.app)  
> **Auteurs :** Makhtar WADE & Elhadj Fallou BOUSSO

Application de gestion pour un système de billetterie de transport, composée de trois microservices indépendants et communicants :
- **Service Utilisateurs** (`backend/`) : authentification, gestion des comptes (administrateurs, agents, clients), profil.
- **Service Abonnements** (`service-abonnements/`) : catalogue de formules, souscription, consommation des voyages, cycle de vie d'un abonnement. Base MySQL dédiée.
- **Service Billetterie** (`service-billetterie/`) : génération des titres numériques et QR Codes, validation en temps réel, gestion de la concurrence distribuée, journalisation technique et piste d'audit inviolable. Base PostgreSQL dédiée.

Les services ne partagent aucune base de données commune : la communication se fait exclusivement par API REST et le jeton JWT.

## Technologies

Backend — Service Utilisateurs
- Node.js, Express (port 5050)
- MongoDB, Mongoose
- bcryptjs — hachage des mots de passe
- jsonwebtoken — authentification par jeton
- multer — upload de fichiers (photo de profil, CSV)
- csv-parser — lecture des fichiers d'import
- nodemailer — envoi des e-mails d'activation
- node:test, supertest — tests unitaires et API

Backend — Service Abonnements
- Node.js, Express (port 5065)
- MySQL, Sequelize
- jsonwebtoken — vérification des jetons émis par le Service Utilisateurs
- node:test, supertest — tests unitaires et API

Backend — Service Billetterie
- Node.js, Express (port 5070)
- PostgreSQL, Sequelize (`pg`, `pg-hstore`)
- qrcode, uuid — génération de tokens cryptographiques et rendu QR Code
- express-rate-limit — protection contre les abus de validation
- winston — journalisation technique et traçabilité
- node:test, supertest — tests unitaires, API et concurrence

Frontend
- React 19, Vite
- React Router
- Jest, babel-jest — tests unitaires
- oxlint — analyse statique

Bases de données
- MongoDB (Service Utilisateurs)
- MySQL (Service Abonnements)
- PostgreSQL (Service Billetterie)

## Fonctionnalités

### Authentification & Profil
- Connexion et déconnexion par jeton JWT
- Écran dédié de changement de mot de passe obligatoire à la première connexion
- Profil du compte connecté, modification d'informations, upload photo

### Gestion des comptes (Administrateur)
- Création individuelle, import CSV avec rejet détaillé
- Recherche et filtres avancés (rôle, statut)
- Activation, blocage et suppression logique
- Correction de l'email d'un compte (identifiant de connexion), sous réserve d'unicité — le statut reste protégé par les routes d'activation dédiées

### Espace Client
- Consultation de ses propres titres de transport et de leur QR Code
- Consultation de son propre droit à voyager (abonnement en cours, voyages restants)

### Service Abonnements
- Catalogue de formules : ticket simple (1 voyage), limité, illimité
- Souscriptions avec calcul d'expiration et de solde
- Un seul abonnement actif par client (tickets cumulables)
- Suspension, réactivation, résiliation définitive, renouvellement
- Vérification du droit à voyager (`GET /api/abonnements/validite/:utilisateurId`)

### Service Billetterie (QR Code, Contrôle, Audit, Thèmes)
- **Génération de QR Codes** : tokens uniques non falsifiables sans exposition de données personnelles sensibles
- **Poste de scan & contrôle en temps réel** : grand retour visuel (VERT pour Autorisé, ROUGE pour Refusé) avec signal sonore et historique de session
- **Règles métier par type de titre** :
  - *Ticket simple* : consommation atomique au 1er passage, refus automatique au 2nd (`TICKET_DEJA_UTILISE`)
  - *Abonnements limité / illimité* : décompte via le Service Abonnements
- **Gestion de la concurrence** : Verrou transactionnel PostgreSQL (`LOCK.UPDATE`) empêchant deux validations simultanées du même titre ou dernier voyage
- **Piste d'audit inviolable** : journal append-only de toutes les actions sensibles (génération, activation/désactivation d'un titre, chaque scan — autorisé ou refusé), avec auteur, rôle, ressource concernée, horodatage et résultat
- **Thème clair et sombre** : Switch instantané avec persistance du choix utilisateur
- **Tableau de bord décisionnel** : KPIs, taux d'autorisation, typologie et analyse des motifs de refus

## API

### Service Utilisateurs (port 5050)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | /api/auth/login | public | connexion |
| POST | /api/auth/logout | public | déconnexion |
| GET | /api/users/profile | connecté | profil du compte connecté |
| PUT | /api/users/profile/password | connecté | changement de mot de passe |
| PUT | /api/users/profile | connecté, mot de passe changé | modification des informations personnelles |
| POST | /api/users/profile/photo | connecté, mot de passe changé | upload de la photo de profil |
| GET | /api/users/lookup | administrateur, agent | identité minimale (nom, prénom, téléphone) de comptes, sans champs sensibles |
| GET | /api/admin/dashboard/stats | administrateur | statistiques utilisateurs |
| POST | /api/admin/users | administrateur | création d'un compte |
| GET | /api/admin/users | administrateur | liste des comptes, recherche et filtres |
| GET | /api/admin/users/:id | administrateur | fiche d'un compte |
| PUT | /api/admin/users/:id | administrateur | modification d'un compte |
| DELETE | /api/admin/users/:id | administrateur | suppression |
| PATCH | /api/admin/users/:id/status | administrateur | changement de statut |
| PATCH | /api/admin/users/bulk-status | administrateur | action groupée |
| POST | /api/admin/users/import | administrateur | import CSV |

### Service Abonnements (port 5065)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | /api/abonnements/formules | administrateur | création d'une formule |
| GET | /api/abonnements/formules | administrateur | catalogue, filtres type/actif |
| GET | /api/abonnements/formules/:id | administrateur | fiche d'une formule |
| PUT | /api/abonnements/formules/:id | administrateur | modification (figée si déjà souscrite) |
| PATCH | /api/abonnements/formules/:id/actif | administrateur | activation/désactivation |
| POST | /api/abonnements/souscriptions | administrateur | souscription d'un client |
| GET | /api/abonnements/souscriptions | administrateur | liste, filtres statut/type/client/expiration |
| GET | /api/abonnements/souscriptions/:id | administrateur | fiche d'un abonnement |
| PATCH | /api/abonnements/souscriptions/:id/statut | administrateur | suspendre / réactiver / résilier |
| POST | /api/abonnements/souscriptions/:id/renouveler | administrateur | renouvellement |
| POST | /api/abonnements/souscriptions/:id/consommer | administrateur, agent | validation d'un voyage |
| GET | /api/abonnements/souscriptions/:id/historique | administrateur | historique des voyages |
| GET | /api/abonnements/validite/:utilisateurId | administrateur, agent, client (son propre compte) | droit à voyager |
| GET | /api/abonnements/dashboard/stats | administrateur | statistiques abonnements |

### Service Billetterie (port 5070)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | /api/billetterie/titres | administrateur | génération d'un titre de transport et QR Code |
| GET | /api/billetterie/titres | administrateur, agent | liste des titres, filtres et recherche |
| GET | /api/billetterie/titres/:id | administrateur, agent | fiche détail et QR code d'un titre |
| PATCH | /api/billetterie/titres/:id/statut | administrateur | activation ou désactivation d'un titre |
| GET | /api/billetterie/titres/client/:utilisateurId | administrateur, agent, client (son propre compte) | titres d'un client |
| POST | /api/billetterie/validations/scan | administrateur, agent | scan et validation en temps réel d'un QR code |
| GET | /api/billetterie/validations | administrateur, agent | historique des passages autorisés et refusés |
| GET | /api/billetterie/validations/:id | administrateur, agent | fiche d'une validation |
| GET | /api/billetterie/audit | administrateur | consultation de la piste d'audit |
| GET | /api/billetterie/dashboard/stats | administrateur | indicateurs d'affluence et statistiques |

## Tests & Intégration Continue (CI)

- Backend Service Utilisateurs : 85 tests, `node --test`
- Backend Service Abonnements : 76 tests, `node --test`
- Backend Service Billetterie : 36 tests, `node --test` (incluant test de concurrence pessimiste et audit)
- Frontend : 43 tests unitaires, `jest`

Total : **240 tests automatisés**, tous passants (0 échec).

```bash
# Lancer tous les tests du projet :
npm test --prefix backend && npm test --prefix service-abonnements && npm test --prefix service-billetterie && npm test --prefix frontend -- --watchAll=false
```

### Pipeline GitHub Actions (`.github/workflows/ci.yml`)

Le projet intègre un pipeline CI automatique déclenché sur chaque `push` et `pull_request` sur les branches `main` et `develop` :
1. **`test-backend`** : Récupère le code, installe Node.js 22, exécute `npm ci`, monte un conteneur de service MongoDB (`mongo:7`) avec vérification de santé, et lance l'ensemble de la suite de tests automatisés.
2. **`build-frontend`** : Récupère le code, installe Node.js 22, exécute `npm ci` et valide la compilation de production avec `npm run build`.

#### Secrets GitHub à configurer (Repository Settings > Secrets and variables > Actions) :
- `MONGO_URI_TEST` : Chaîne de connexion à la base MongoDB de test (ex: conteneur de service ou MongoDB Atlas).
- `JWT_SECRET` : Clé secrète pour signer les jetons JWT de test.
- `VITE_API_URL` : URL de l'API backend utilisée par le frontend.
- `EMAIL_USER` / `EMAIL_PASS` : Identifiants SMTP pour les tests d'envoi d'e-mails.

---

## Utilisation de Docker (TP 2 — Étape 1)

Le backend dispose d'un `Dockerfile` basé sur Node.js 22 Alpine optimisé pour la production avec exclusion des fichiers inutiles via `.dockerignore`.

### 1. Construire l'image Docker du backend
```bash
cd backend
docker build -t billetterie-backend .
```

### 2. Exécuter le conteneur du backend
```bash
docker run -d -p 8000:8000 --name billetterie-backend --env-file .env billetterie-backend
```

### 3. Consulter les conteneurs et les logs
```bash
docker ps
docker logs -f billetterie-backend
```

---

## Orchestration avec Docker Compose (TP 2 — Étape 2)

Le fichier `docker-compose.yml` à la racine orchestre le backend et sa base MongoDB avec persistance des données via volume nommé.

### Services configurés :
* `mongo` : Image officielle `mongo:7`, port exposé `27017:27017`, volume `mongo_data`.
* `backend` : Image construite depuis `./backend`, port `8000:8000`, connecté au réseau Docker interne avec `MONGO_URI: mongodb://mongo:27017/billetterie`.

### Commandes Docker Compose :
```bash
# Lancer les services en arrière-plan avec reconstruction :
docker compose up --build -d

# Vérifier l'état des conteneurs :
docker compose ps

# Consulter les logs en temps réel :
docker compose logs -f

# Arrêter les services :
docker compose down

# Arrêter et supprimer les volumes (réinitialisation complète) :
docker compose down -v
```

---

## Déploiement de la solution (TP 2 — Étapes 3 & 4)

### 1. Déploiement du Backend (Render, Railway, VPS)
* **Plateforme** : Créer un Web Service connecté au dépôt GitHub (ou pousser l'image Docker).
* **Répertoire racine** : `backend`
* **Commande de build** : `npm ci --omit=dev`
* **Commande de démarrage** : `npm start`
* **Variables d'environnement requises** :
  | Variable | Rôle / Exemple |
  |---|---|
  | `PORT` | Port d'écoute de l'API (ex: `8000` ou assigné par la plateforme) |
  | `MONGO_URI` | Chaîne de connexion MongoDB Atlas (`mongodb+srv://...`) |
  | `JWT_SECRET` | Secret fort pour signer et valider les tokens JWT |
  | `NODE_ENV` | `production` |
  | `EMAIL_USER` | Compte SMTP pour l'envoi d'emails d'activation |
  | `EMAIL_PASS` | Mot de passe d'application SMTP |

### 2. Déploiement du Frontend (Vercel, Netlify, VPS)
* **Plateforme** : Créer un projet statique connecté au dépôt GitHub.
* **Répertoire racine** : `frontend`
* **Commande de build** : `npm run build`
* **Répertoire de sortie** : `dist`
* **Variables d'environnement requises** :
  | Variable | Rôle / Exemple |
  |---|---|
  | `VITE_API_URL` | URL HTTPS publique du backend déployé (ex: `https://billetterie-api.onrender.com`) |

---

## Comptes de test

Après initialisation de la base (`npm run seed:admin --prefix backend` ou via l'API) :

| Rôle | Email | Mot de passe | Accès |
|---|---|---|---|
| **Administrateur** | `admin@billetterie.com` | `Admin1234` | Tableau de bord, utilisateurs, formules, audit, abonnements, titres |
| **Agent de contrôle** | `agent@billetterie.com` | `Admin1234` | Scan QR Code, titres, historique des passages |
| **Client voyageur** | `client@billetterie.com` | `Admin1234` | Espace client mobile/desktop, mes titres, consultation du QR Code |

---

## Problèmes rencontrés & Améliorations possibles

### Problèmes résolus lors des TPs :
1. **Concurrence sur les validations** : Deux validations simultanées du même ticket simple ou du dernier voyage d'un abonnement pouvaient causer une double dépense. Résolu avec un verrou pessimiste PostgreSQL transactionnel (`LOCK.UPDATE`).
2. **Cohérence des services de la CI** : Le conteneur de service MongoDB sous GitHub Actions nécessitait une commande de healthcheck adaptée (`mongosh --eval 'db.runCommand({ ping: 1 })'`) pour éviter les démarrages prématurés des tests.
3. **Responsivité mobile** : Amélioration complète de l'interface pour smartphone (barre de navigation basse, menu tiroir off-canvas, cartes tactiles pour les clients, et écran de scan caméra plein écran).

### Améliorations possibles :
* **Cache Redis** : Mise en cache des formules et des droits à voyager pour accélérer encore le temps de réponse lors des pics de scan aux portiques.
* **Mode hors-ligne (PWA)** : Permettre aux agents de valider des titres en mode déconnecté avec une clé cryptographique asynchrone et synchronisation différée.
* **Docker Compose Multi-services** : Ajouter le service PostgreSQL (Billetterie) et MySQL (Abonnements) dans un docker-compose complet de production.

---

## Documentation

- [CHECKLIST_DEPLOIEMENT.md](CHECKLIST_DEPLOIEMENT.md) — Grille de vérification post-déploiement et scénario métier (TP 2)
- [PLAN-SERVICE-BILLETTERIE.md](PLAN-SERVICE-BILLETTERIE.md) — Contrat d'API, modèle PostgreSQL, concurrence, audit et règles du Service Billetterie
- [PLAN-SERVICE-ABONNEMENTS.md](PLAN-SERVICE-ABONNEMENTS.md) — Contrat d'API et architecture du Service Abonnements
- [docs/service-billetterie.md](docs/service-billetterie.md) — Livrable Service Billetterie : fonctionnalités critiques, plan de tests
- [docs/service-abonnements.md](docs/service-abonnements.md) — Livrable Service Abonnements
- [docs/TP1-service-utilisateurs.md](docs/TP1-service-utilisateurs.md) — Livrable Service Utilisateurs

