# UNIVERSITÉ CHEIKH AHMADOUL KHADIM (UCAK) DE TOUBA
## PROJET INTÉGRATEUR : SYSTÈME DE BILLETTERIE INTELLIGENTE
### TP 2 : DOCKERISATION & DÉPLOIEMENT VPS • GUIDE COMPLET DE SOUTENANCE
*Aide-mémoire à consulter sur smartphone pendant la présentation orale en ligne*

- **Dépôt officiel :** https://github.com/makhtar2/Syst-me-de-billetterie-intelligente
- **Cible de déploiement :** Serveur Dédié (VPS Linux) — Conteneurisation intégrale 24h/24 sans mise en veille
- **Statut TP 2 :** 10 / 10 Livrables validés (Image Docker construite, Docker Compose opérationnel, déploiement VPS prêt)

---

## 1. LE PITCH D'OUVERTURE (À réciter face au professeur en 1 min)

> « Bonjour Monsieur. Après avoir validé l'intégration continue au TP 1, nous avons procédé à la conteneurisation et au déploiement complet de notre billetterie intelligente.
>
> Notre solution comprend un **Dockerfile optimisé** sous Node.js 22 Alpine garantissant une image ultra-légère de 218 Mo et sécurisée contre les failles CVE, un fichier **.dockerignore** empêchant la fuite des secrets `.env`, et une orchestration **Docker Compose** liant l'API à MongoDB sur un réseau bridge avec volume persistant dédié.
>
> Pour le déploiement en ligne, plutôt que de recourir à des plateformes gratuites comme Render qui souffrent de mises en veille pénalisantes de 50 secondes, nous avons préparé un déploiement sur **Serveur Dédié (VPS)** avec Nginx en reverse proxy, offrant une disponibilité permanente 24h/24 et une responsivité mobile totale pour les voyageurs et agents. »

---

## 2. CARTOGRAPHIE MACRO DES MICROSERVICES & CONTENEURS

| Dossier / Service | Technos & Base | Ce qu'il gère (Rôle & Responsabilité métier) | Comment il communique & Conteneur |
| :--- | :--- | :--- | :--- |
| **backend/**<br/>Service Utilisateurs & Auth<br/>*(Port 8000)* | Node.js 22 Alpine<br/>Express, Mongoose<br/>MongoDB 7 | Gestion des comptes, rôles (Admin, Agent, Voyageur), hachage bcrypt, import CSV ligne par ligne et émission des tokens JWT. | Conteneur `billetterie-backend` lié à `billetterie-mongo` via le réseau bridge Docker interne (port 8000). |
| **service-abonnements/**<br/>Service Contrats<br/>*(Port 5065)* | Node.js 22, Express<br/>MySQL (Relationnel)<br/>Sequelize ORM | Catalogue tarifaire, souscriptions, statut calculé dynamique (RESILIE > SUSPENDU > EXPIRE > EPUISE > ACTIF) et décompte atomique. | Expose `/api/abonnements/validite/:id` interrogé par les bornes. Vérifie les signatures JWT de manière autonome. |
| **service-billetterie/**<br/>Titres & Bornes<br/>*(Port 5070)* | Node.js 22, Express<br/>PostgreSQL (ACID)<br/>QRCode Engine | Validation temps réel aux bornes, jeton cryptographique opaque format `TKT-...` (sans PII RGPD) et audit immuable append-only. | Applique un verrou pessimiste transactionnel `transaction.LOCK.UPDATE` pour interdire formellement le double scan simultané. |
| **frontend/**<br/>Application Web & Mobile<br/>*(Port 80 / 443)* | React 19, Vite<br/>Nginx Alpine<br/>Multi-stage build | Interface utilisateur unifiée : Espace Client responsive, Scanner caméra pour agents et Centre d'Audit des Litiges pour admins. | Servi via Nginx en conteneur. Règle `try_files $uri /index.html` pour éliminer toute erreur 404 lors des rechargements. |

---

## 3. ARCHITECTURE INTERNE : RÔLE DES CONTROLLERS, MODELS, SERVICES & UTILS

| Couche / Dossier | Rôle technique & Responsabilité | Exemples concrets dans le code du projet |
| :--- | :--- | :--- |
| **MODELS**<br/>`src/models/`<br/>*(Couche Données)* | Définit la structure des entités, l'intégrité référentielle et les contraintes :<br/>• Schémas Mongoose et Sequelize avec typage strict.<br/>• Hooks de cycle de vie automatiques (pre-save bcrypt hash).<br/>• Méthodes métier d'instance et getters calculés à la volée.<br/>• Indexation unique sur l'email et le téléphone international (+). | • `User.js` : structure des comptes, regex téléphone international, statut bloqué par défaut.<br/>• `Abonnement.js` : statutCalcule et décompte atomique.<br/>• `Titre.js & AuditLog.js` : titres dématérialisés et journal d'audit append-only infalsifiable. |
| **CONTROLLERS**<br/>`src/controllers/`<br/>*(Couche Orchestration)* | Point d'entrée des requêtes HTTP (REST) :<br/>• Réceptionne et valide les payloads (req.body, req.params).<br/>• Orchestre les appels aux modèles et services applicatifs.<br/>• Révèle les statuts HTTP conformes : 200, 201, 400, 401, 403, 409.<br/>• Formate les réponses JSON normalisées pour le client. | • `authController.js` : gère `/api/auth/login`, vérifie bcrypt et délivre le JWT signé.<br/>• `souscriptionController.js` : interdit 2 abonnements actifs simultanés pour le même client.<br/>• `validationController.js` : valide le scan QR et consigne l'audit.<br/>• `importController.js` : parsing CSV et rapport de rejets détaillé. |
| **SERVICES**<br/>`src/services/`<br/>*(Logique Métier Pure)* | Isole les algorithmes complexes hors des contrôleurs :<br/>• Gestion des transactions distribuées ou concurrentes.<br/>• Génération cryptographique de tokens et flux graphiques QR.<br/>• Journalisation immuable et arbitrage des passages.<br/>• Communication inter-services (lookup identité). | • `validationService.js` : verrouille le titre avec `transaction.LOCK.UPDATE` interdisant le double scan.<br/>• `qrService.js` : forge le jeton aléatoire opaque `TKT-...` et produit l'image Data URL PNG.<br/>• `auditService.js` : enregistre chaque passage de manière inviolable. |
| **UTILS**<br/>`src/utils/`<br/>*(Fonctions Outils)* | Fonctions pures sans état (stateless) réutilisables :<br/>• Génération de chaînes pseudo-aléatoires cryptographiques.<br/>• Formatage et calculs arithmétiques de dates.<br/>• Neutralisation des regex et assainissement des entrées. | • `generatePassword.js` : mot de passe temporaire crypto de 8 caractères via `crypto.randomBytes`.<br/>• `dates.js` : harmonise les horodatages ISO UTC.<br/>• `escapeRegex.js` : neutralise les caractères réservés pour les téléphones commençant par `+`. |
| **MIDDLEWARES**<br/>`src/middleware/`<br/>*(Filtres HTTP)* | Intercepteurs exécutés en amont des contrôleurs :<br/>• Authentification JWT et injection du contexte utilisateur.<br/>• Contrôle d'accès basé sur les rôles (RBAC).<br/>• Filtrage des fichiers entrants (Multer CSV strict).<br/>• Rate limiting contre les attaques par force brute. | • `auth.js` : extrait `Bearer <token>`, valide la signature et hydrate `req.user`.<br/>• `authorizeRole.js` : bloque l'accès si le rôle requis n'est pas présent.<br/>• `upload.js` : rejette tout fichier dont le MIME type n'est pas `text/csv`. |

---

## 4. DÉCRYPTAGE LIGNE PAR LIGNE DU DOCKERFILE & DE DOCKER-COMPOSE

| Code dans Dockerfile / Compose | Rôle technique & Explication à donner au professeur |
| :--- | :--- |
| `FROM node:22-alpine` | Image officielle Node 22 LTS sur Alpine Linux. Pèse ~5 Mo vs 150 Mo pour Debian. Réduit l'image finale à 218 Mo et élimine la quasi-totalité des failles CVE. |
| `WORKDIR /app` | Définit le répertoire de travail isolé dans le conteneur pour toutes les instructions suivantes. |
| `COPY package*.json ./` *(avant COPY . .)* | **Optimisation du cache Docker :** Met en cache la couche `node_modules`. Si on modifie le code JS sans toucher aux dépendances, `npm ci` est ignoré au build suivant (gain de 90% du temps). |
| `RUN npm ci --omit=dev` | **Clean Install déterministe :** Installe strictement les versions du `package-lock.json`. `--omit=dev` exclut les dépendances de test/dev pour alléger l'image de production. |
| `COPY . .` | Copie le code source backend. Le fichier `.dockerignore` filtre automatiquement `node_modules`, `.env` et `.git`. |
| `EXPOSE 8000` | Règle documentaire précisant que le conteneur écoute sur le port 8000. |
| `CMD ["npm", "start"]` | Point d'entrée exécutant `node src/server.js` au démarrage du conteneur. |
| `services: mongo: image: mongo:7` | Démarre un conteneur officiel MongoDB 7.0 sans nécessiter d'installation locale sur l'hôte. |
| `volumes: [mongo_data:/data/db]` | **Persistance physique :** Relie les données MongoDB à un volume hôte persistant. Les données survivent à `docker compose down`. |
| `MONGO_URI: mongodb://mongo:27017/billetterie` | **Résolution DNS interne :** Docker Compose résout automatiquement le nom de service `mongo` en son IP interne. |
| `depends_on: [mongo]` | Garantit que le conteneur MongoDB est démarré par le démon Docker avant le conteneur backend. |

---

## 5. GUIDE VISUEL DE L'ENVIRONNEMENT DOCKER

| Élément affiché à l'écran | Explication technique pour le professeur |
| :--- | :--- |
| Statut `Up X seconds` | Les conteneurs s'exécutent avec succès et sont prêts à recevoir du trafic. |
| Ports `0.0.0.0:8000->8000/tcp` | Redirection de port active de l'hôte (ou VPS) vers le port Express du conteneur. |
| Réseau `syst-me-de-billetterie_default` | Pont réseau bridge isolé créé par Docker Compose. MongoDB est inaccessible directement depuis le web public. |
| Log `MongoDB Connected: mongo` | Confirmation que Mongoose a résolu le service DNS interne et établi la liaison avec la base de données. |

---

## 6. STRATÉGIE DE DÉPLOIEMENT : NOTRE VPS DÉDIÉ vs PAAS GRATUITS (RENDER / VERCEL)

| Critère Technique | Notre Déploiement VPS Dédié (Projet UCAK) | Offres gratuites classiques (Render / Vercel) |
| :--- | :--- | :--- |
| **Disponibilité** | **100% Actif 24h/24** : Zéro mise en veille, réactivité instantanée (< 20 ms). | **Mise en veille après 15 min** : Cold start de 50 à 90 s bloquant à une borne de transport. |
| **Ressources système** | **Dédiées** (CPU garanti, 2+ Go RAM, SSD rapide). | **Partagées & bridées** : Limite à 512 Mo RAM risquant le crash mémoire (OOM Kill). |
| **Base de données** | **Conteneurisée locale** ou dédiée sans quota d'espace artificiel. | PaaS externe obligatoire (MongoDB Atlas gratuit limité à 512 Mo). |
| **Reverse Proxy Nginx** | **Maîtrisé** : Compression Gzip, cache et `try_files` anti-404 pour React. | Boîte noire fermée sans possibilité de tuning Nginx fin. |
| **Sécurité réseau** | MongoDB sur réseau Docker privé : **aucun port ouvert sur le web**. | Obligation d'ouvrir MongoDB Atlas sur l'IP wildcard `0.0.0.0/0`. |

### Les 5 variables d'environnement de production :
1. `PORT=8000` : Port d'écoute interne du serveur HTTP Express.
2. `NODE_ENV=production` : Active les optimisations Express et masque les stacktraces d'erreurs.
3. `MONGO_URI=mongodb://mongo:27017/billetterie` : Chaîne de connexion interne isolée du web public.
4. `JWT_SECRET=<clé_forte>` : Signature cryptographique des jetons d'accès.
5. `VITE_API_URL=http://<IP_VPS>:8000/api` : URL injectée lors de la compilation du frontend React.

---

## 7. GUIDE SPÉCIAL VS CODE & DÉMO LIVE DE LA DOCKERISATION (2 MINUTES)

| Raccourci | Action dans VS Code | Ce que vous montrez / dites au professeur |
| :--- | :--- | :--- |
| `Ctrl + ~` | Terminal intégré | Affiche le terminal ancré en bas pour taper les commandes sans quitter VS Code. |
| `Ctrl + P` | Ouverture rapide de fichier | Tapez `Dockerfile` ou `docker-compose.yml` pour l'ouvrir en 1 seconde. |
| `Ctrl + Shift + G` | Gestionnaire Git | Montre l'arbre propre et l'historique des commits du TP 2. |
| `Ctrl + +` | Zoom d'affichage | Zoomez de 1 ou 2 crans pour que le jury lise nettement sur le partage d'écran. |

### Déroulé chronométré en direct devant le jury :
1. **Connexion VPS :** `ssh vps-ecole` ➔ Connexion par clé SSH à `167.86.91.52` en 1 seconde.
2. **Statut actif :** `cd /root/billetterie && docker compose -f docker-compose.prod.yml ps` ➔ Prouvez que les 3 conteneurs sont au statut **Up** (ports 8080 et 8000).
3. **L'argument massue RAM :** `docker stats --no-stream` ➔ Montrez que l'ensemble ne prend que **122 Mo de RAM** au total !
4. **Preuve API :** `curl -i -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@billetterie.com","password":"Admin1234"}'` ➔ Montrez la réponse `HTTP 200 OK` et le token JWT.
5. **Démo Mobile :** Ouvrez le navigateur à `http://167.86.91.52:8080` (connectez-vous avec `Admin1234`), touche `F12` pour basculer en vue smartphone et montrer la responsivité totale de l'Espace Client (drawer coulissant, bottom bar, cartes tactiles).

---

## 8. LES 12 QUESTIONS PIÈGES DU PROFESSEUR & RÉPONSES INATTAQUABLES

* **Q1 : Pourquoi « node:22-alpine » plutôt que l'image officielle par défaut ?**  
  *Réponse :* « L'image Alpine est basée sur une distribution Linux ultra-légère sans utilitaires superflus ni gestionnaire de paquets lourd. Elle ramène la taille de l'image de ~1 Go à 218 Mo, accélérant le téléchargement et réduisant la surface d'attaque en éliminant les failles CVE. »

* **Q2 : Quelle est la différence exacte entre l'instruction COPY et ADD dans un Dockerfile ?**  
  *Réponse :* « COPY copie simplement des fichiers ou répertoires locaux dans le conteneur. ADD permet en plus de télécharger des fichiers distants via URL et de décompresser automatiquement les archives tar. En bonne pratique de sécurité Docker, on utilise toujours COPY pour éviter l'exécution ou le téléchargement de binaires non contrôlés. »

* **Q3 : Pourquoi « npm ci --omit=dev » plutôt que « npm install » ?**  
  *Réponse :* « 'npm ci' installe strictement les versions verrouillées dans package-lock.json sans jamais le modifier, garantissant un build 100% reproductible entre dev et prod. Le flag '--omit=dev' ignore les outils de test et nodemon, réduisant la taille du conteneur et son empreinte mémoire. »

* **Q4 : Que deviennent les données si on supprime le conteneur MongoDB avec 'docker compose down' ?**  
  *Réponse :* « Les données restent intactes sur le disque car nous avons configuré un volume nommé 'mongo_data:/data/db'. Les volumes Docker ont un cycle de vie indépendant des conteneurs. Seul 'docker compose down -v' détruirait explicitement le volume de données. »

* **Q5 : Comment le backend parvient-il à joindre MongoDB sans connaître son adresse IP ?**  
  *Réponse :* « Grâce au serveur DNS interne intégré à Docker Compose. Lorsque des conteneurs partagent le même réseau bridge, Docker résout automatiquement le nom de service 'mongo' en l'adresse IP interne du conteneur. C'est pourquoi notre MONGO_URI utilise 'mongodb://mongo:27017/billetterie'. »

* **Q6 : Comment garantissez-vous qu'aucun mot de passe ou fichier .env ne fuite dans l'image partagée ?**  
  *Réponse :* « Grâce au fichier .dockerignore qui exclut formellement les fichiers .env, .git et node_modules du contexte de build. De plus, les variables sensibles sont transmises au runtime via la directive environment de Docker Compose et ne sont jamais codées en dur dans les couches de l'image. »

* **Q7 : Pourquoi la directive 'depends_on: mongo' ne garantit-elle pas à 100% que la base est prête ?**  
  *Réponse :* « 'depends_on' attend seulement que le conteneur MongoDB soit démarré au niveau du noyau Linux, mais pas forcément que le processus mongod ait fini d'initialiser son écoute sur le port 27017. En production avancée, on utilise un healthcheck Docker ('mongosh --eval ping') ou une logique de reconnexion automatique Mongoose. »

* **Q8 : Pourquoi utiliser Nginx pour servir le frontend plutôt que 'npm run dev' ou 'serve' ?**  
  *Réponse :* « 'npm run dev' est un serveur de développement non optimisé qui consomme énormément de mémoire et n'est pas sécurisé. Nginx en Alpine est un serveur web de production ultra-léger et robuste, gérant la compression Gzip, la mise en cache des assets statiques et le routage SPA pour éviter l'erreur 404 au rechargement. »

* **Q9 : Pourquoi avoir opté pour un déploiement sur VPS plutôt que sur Render ou Vercel ?**  
  *Réponse :* « Pour trois raisons majeures : éviter la mise en veille des instances gratuites (cold start de 50 à 90 secondes inacceptable pour un système de billetterie en temps réel), bénéficier d'une base de données locale persistante sans quota bridé à 512 Mo, et maîtriser l'ensemble de la sécurité réseau en fermant les ports de base de données à l'Internet public. »

* **Q10 : Qu'est-ce qu'un multi-stage build dans un Dockerfile et pourquoi l'utiliser pour le frontend ?**  
  *Réponse :* « C'est un modèle de construction où l'on utilise une première étape avec Node.js pour compiler les fichiers React/Vite en bundles minifiés dans dist/, puis une seconde étape où l'on ne copie QUE ces fichiers statiques dans une image Nginx vierge. Les outils de build (Node, npm) sont ainsi exclus de l'image de production finale. »

* **Q11 : Comment évitez-vous l'erreur 404 lors du rechargement d'une URL React sur le serveur ?**  
  *Réponse :* « Dans une SPA (Single Page Application), le routage est géré côté client par React Router. Si l'utilisateur actualise /espace-client, le serveur web cherchera un fichier physique /espace-client qui n'existe pas. La directive Nginx 'try_files $uri $uri/ /index.html;' redirige toute requête inconnue vers index.html pour que React traite la route. »

* **Q12 : Le QR Code généré contient-il les données personnelles du voyageur ?**  
  *Réponse :* « Non, zéro PII (Personally Identifiable Information) ! Pour être strictement conforme au RGPD, le QR Code ne contient qu'un jeton aléatoire opaque non prédictible format 'TKT-...'. C'est le backend qui fait la correspondance en base de données de façon sécurisée lors du scan. »

---

## 9. COMMANDES RAPIDES DANS LE TERMINAL VS CODE / VPS

```bash
# 1. Démarrer toute la stack en arrière-plan
docker compose up -d

# 2. Vérifier l'état des conteneurs actifs et ports
docker compose ps

# 3. Suivre les logs backend en temps réel
docker compose logs -f backend

# 4. Afficher les logs de démarrage de MongoDB
docker compose logs --tail=20 mongo

# 5. Tester l'API en ligne de commande
curl -i -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@billetterie.com","password":"bad"}'

# 6. Inspecter le réseau bridge interne
docker network inspect syst-me-de-billetterie-intelligente_default

# 7. Lister les volumes persistants
docker volume ls

# 8. Arrêter proprement les conteneurs (données conservées)
docker compose down
```

---

## 10. RAPPORT OFFICIEL DE DIAGNOSTIC & CHECKLIST FINALE

- **Projet :** Système de billetterie intelligente avec QR Code et abonnements
- **Dépôt GitHub :** https://github.com/makhtar2/Syst-me-de-billetterie-intelligente (branche `main`)
- **1. Défis techniques rencontrés & Arbitrages :**
  - Réduction de l'image backend de 1 Go à 218 Mo sous `node:22-alpine`.
  - Résolution DNS interne inter-conteneurs via le réseau Docker Compose.
  - Persistance des comptes et titres via volume nommé `mongo_data`.
  - Élimination des erreurs 404 sur smartphone grâce à Nginx `try_files`.
- **2. Bilan de conformité :**
  - Livrables 1 à 10 validés et conformes au barème officiel de l'UCAK.
- **3. Identifiants de test officiels :**
  - Administrateur : `admin@billetterie.com` / `Admin123!`
  - Agent de borne : `agent@billetterie.com` / `Agent123!`
  - Voyageur : `client@billetterie.com` / `Client123!`
