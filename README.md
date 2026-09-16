# Système de billetterie intelligente

Application de gestion pour un système de billetterie de transport, composée de deux services indépendants :
- **Service Utilisateurs** (`backend/`) : authentification, gestion des comptes (administrateurs, agents, clients), profil.
- **Service Abonnements** (`service-abonnements/`) : catalogue de formules, souscription, consommation des voyages, cycle de vie d'un abonnement. Ne se connecte jamais à la base du Service Utilisateurs — seul le jeton JWT est partagé entre les deux.

Le Service Billetterie/QR Code n'est pas développé à ce stade.

## Technologies

Backend — Service Utilisateurs
- Node.js, Express
- MongoDB, Mongoose
- bcryptjs — hachage des mots de passe
- jsonwebtoken — authentification par jeton
- multer — upload de fichiers (photo de profil, CSV)
- csv-parser — lecture des fichiers d'import
- nodemailer — envoi des e-mails d'activation
- node:test, supertest — tests unitaires et API

Backend — Service Abonnements
- Node.js, Express
- MySQL, Sequelize
- jsonwebtoken — vérification des jetons émis par le Service Utilisateurs
- node:test, supertest — tests unitaires et API

Frontend
- React 19, Vite
- React Router
- Jest, babel-jest — tests unitaires
- oxlint — analyse statique

Bases de données
- MongoDB (Service Utilisateurs)
- MySQL (Service Abonnements)

## Fonctionnalités

Authentification
- Connexion et déconnexion par jeton JWT
- Écran dédié de changement de mot de passe obligatoire à la première connexion

Profil du compte connecté
- Consultation et modification des informations personnelles (nom, prénom, téléphone)
- Changement de mot de passe avec confirmation de l'ancien
- Upload de la photo de profil
- Affichage ou masquage du mot de passe à la saisie

Gestion des comptes (administrateur)
- Création individuelle d'un compte (administrateur, agent, client)
- Import en masse par fichier CSV, avec détail des lignes rejetées (doublon, champ manquant, rôle invalide)
- Consultation de la liste des comptes
- Recherche par e-mail, téléphone ou identifiant
- Filtrage par rôle et par statut
- Modification d'un compte (nom, prénom, téléphone, rôle)
- Activation, blocage et suppression, individuels et groupés
- Suppression logique : le compte passe au statut Supprimé, l'enregistrement est conservé

Tableau de bord
- Statistiques par rôle et statistiques globales : total, actifs, bloqués, supprimés

Validation des saisies
- Format de l'adresse e-mail
- Format du numéro de téléphone : 9 chiffres, indicatif +221 optionnel

### Service Abonnements

Formules
- Création, consultation, modification, activation/désactivation
- Tarif, durée de validité et nombre de voyages figés dès qu'une formule a au moins un abonnement ; nom et description restent modifiables
- Trois types : ticket simple (1 voyage), limité (nombre de voyages fixé), illimité

Souscriptions
- Souscription d'un client à une formule active, avec calcul automatique de la date d'expiration et du solde de voyages
- Un seul abonnement limité ou illimité en cours par client ; les tickets simples restent cumulables
- Recherche et filtres : statut, type, client, expiration proche
- Fiche détail avec solde, dates et historique des voyages

Cycle de vie
- Suspension et réactivation
- Résiliation définitive
- Renouvellement (sauf pour un ticket simple)

Consommation
- Décompte d'un voyage à la validation, avec le motif exact en cas de refus (expiré, épuisé, suspendu, résilié)
- Un scan rejoué ne décompte jamais deux fois le même voyage
- Vérification de la validité d'un titre, destinée au futur Service Billetterie

Tableau de bord
- Total, répartition par statut et par type, voyages consommés, revenu total, abonnements expirant sous 7 jours

## Structure du code

### backend/

```
src/
  app.js            application Express (sans écoute réseau, utilisée aussi par les tests)
  server.js         point d'entrée, démarre le serveur et la connexion MongoDB
  config/db.js      connexion à MongoDB
  models/User.js    schéma Mongoose : rôle, statut, mot de passe haché, mustChangePassword
  routes/
    authRoutes.js    /api/auth
    userRoutes.js    /api/users (profil du compte connecté)
    adminRoutes.js   /api/admin (gestion des comptes, réservé aux administrateurs)
  controllers/
    authController.js
    profileController.js
    userController.js
    importController.js
  middleware/
    auth.js          protect, isAdmin, requirePasswordChanged
    upload.js         configuration multer (photo, CSV)
  utils/
    escapeRegex.js       neutralise les caractères spéciaux pour la recherche
    generatePassword.js  génération du mot de passe temporaire
    sendEmail.js          envoi des e-mails
  seed/               création du compte administrateur initial
tests/
  unitaires/          fonctions pures : mot de passe temporaire, échappement regex, modèle User
  api/                routes testées via supertest : authentification, CRUD, import CSV, activation
```

### service-abonnements/

```
src/
  app.js                     application Express (sans écoute réseau, utilisée aussi par les tests)
  server.js                  point d'entrée, démarre le serveur et la synchronisation MySQL
  config/database.js         connexion Sequelize à MySQL
  models/
    Formule.js                catalogue des formules
    Abonnement.js              souscriptions d'un client
    Consommation.js            historique des voyages validés
  middleware/auth.js          vérifie les jetons émis par le Service Utilisateurs (même JWT_SECRET)
  controllers/
    formuleController.js
    souscriptionController.js
    consommationController.js
    validiteController.js
    statistiquesController.js
  routes/
    formuleRoutes.js           /api/abonnements/formules
    souscriptionRoutes.js      /api/abonnements/souscriptions
    validiteRoutes.js          /api/abonnements/validite
    statistiquesRoutes.js      /api/abonnements/dashboard
  seed/                       formules de départ
tests/
  unitaires/                  fonctions pures : solde de voyages, statut effectif, validation des modèles
  api/                        routes testées via supertest : formules, souscriptions, consommation, tableau de bord, auth
```

### frontend/

```
src/
  App.jsx                     déclaration des routes
  components/
    DashboardLayout.jsx        barre de navigation, redirection si non connecté ou mot de passe temporaire
    CreateUserModal.jsx        création d'un utilisateur
    EditUserModal.jsx          modification d'un utilisateur
    ImportCsvModal.jsx         import CSV, affichage des erreurs
    PasswordInput.jsx          champ mot de passe avec bascule visible/masqué
    StatCard.jsx                carte de statistiques du tableau de bord (Service Utilisateurs)
    FormuleModal.jsx            création/édition d'une formule
    SouscriptionModal.jsx       souscription d'un client à une formule
  pages/
    Login.jsx                   connexion
    ForcePasswordChange.jsx     changement de mot de passe obligatoire
    ProfileSettings.jsx         profil du compte connecté
    UserManagement.jsx          gestion des comptes : liste, statistiques, actions
    FormulesManagement.jsx      catalogue des formules
    AbonnementsManagement.jsx   liste des abonnements, souscription
    AbonnementDetail.jsx        fiche détail : solde, historique, cycle de vie
    AbonnementStats.jsx         tableau de bord des abonnements
  services/
    api.js                      appels HTTP vers le Service Utilisateurs, gestion du jeton JWT
    apiAbonnements.js           client du Service Abonnements (appels HTTP réels vers service-abonnements, port 5065)
  utils/
    validators.js                règles de validation Service Utilisateurs : e-mail, téléphone, mot de passe
    validatorsAbonnements.js     règles de validation Service Abonnements : formule, souscription
```

## API

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | /api/auth/login | public | connexion |
| POST | /api/auth/logout | public | déconnexion |
| GET | /api/users/profile | connecté | profil du compte connecté |
| PUT | /api/users/profile/password | connecté | changement de mot de passe |
| PUT | /api/users/profile | connecté, mot de passe changé | modification des informations personnelles |
| POST | /api/users/profile/photo | connecté, mot de passe changé | upload de la photo de profil |
| GET | /api/admin/dashboard/stats | administrateur | statistiques |
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
| GET | /api/abonnements/validite/:utilisateurId | administrateur, agent | droit à voyager (futur Service Billetterie) |
| GET | /api/abonnements/dashboard/stats | administrateur | statistiques |

## Tests

Backend Service Utilisateurs : 80 tests (14 unitaires, 66 API), `node --test`.
```bash
cd backend
npm test
```

Backend Service Abonnements : 75 tests (24 unitaires, 51 API), `node --test`.
```bash
cd service-abonnements
npm test
```

Frontend : 34 tests unitaires (22 Service Utilisateurs, 12 Service Abonnements), Jest. Les deux clients API (`services/api.js`, `services/apiAbonnements.js`) ne sont pas testés unitairement : ce sont de vrais clients HTTP, leur logique est couverte côté serveur.
```bash
cd frontend
npm test
```

## Installation et démarrage

Prérequis : Node.js 18 ou plus, MongoDB en local, MySQL en local (voir [docs/guide-tests-et-demo.md](docs/guide-tests-et-demo.md)).

```bash
npm run install-all
```

Créer `backend/.env` sur le modèle de `backend/.env.example`, et `service-abonnements/.env` sur le modèle de `service-abonnements/.env.example` (même `JWT_SECRET` des deux côtés).

```bash
npm run dev
```

Démarre les trois services ensemble : l'API Express du Service Utilisateurs (port 5050), l'API Express du Service Abonnements (port 5065) et le serveur de développement React (port 5173).

## Documentation

- [PLAN-SERVICE-ABONNEMENTS.md](PLAN-SERVICE-ABONNEMENTS.md) — contrat d'API, répartition des tâches et règles de travail du Service Abonnements
- [CONTRIBUTING.md](CONTRIBUTING.md) — gestion des branches, commits, normes de codage
- [docs/plan_service_utilisateurs.md](docs/plan_service_utilisateurs.md) — plan d'implémentation initial du Service Utilisateurs
- [docs/TP1-service-utilisateurs.md](docs/TP1-service-utilisateurs.md) — livrable Service Utilisateurs : fonctionnalités critiques, plan de tests, tableau de synthèse, scénario fonctionnel
- [docs/service-abonnements.md](docs/service-abonnements.md) — livrable Service Abonnements : mêmes rubriques
- [docs/guide-tests-et-demo.md](docs/guide-tests-et-demo.md) — installation, commandes de test, parcours de démonstration des deux services
- [docs/presentation/tp1-service-utilisateurs.md](docs/presentation/tp1-service-utilisateurs.md) — support de présentation Service Utilisateurs (Marp) ; export PDF dans [docs/pdf/TP1-Service-Utilisateurs-presentation.pdf](docs/pdf/TP1-Service-Utilisateurs-presentation.pdf)
- [docs/presentation/service-abonnements.md](docs/presentation/service-abonnements.md) — support de présentation Service Abonnements (Marp) ; export PDF dans [docs/pdf/Service-Abonnements-presentation.pdf](docs/pdf/Service-Abonnements-presentation.pdf)
