# GUIDE DE SOUTENANCE — TP 2 : DOCKER, ORCHESTRATION & DÉPLOIEMENT

> **Université Cheikh Ahmadoul Khadim (UCAK) de Touba**  
> **Projet intégrateur :** Système de billetterie intelligente multi-services (SunuTicket)  
> **Auteurs :** Makhtar WADE & Elhadj Fallou BOUSSO  
> **Périmètre évalué :** **TP 2 uniquement** (Conteneurisation Docker, Docker Compose, Déploiement en ligne et Checklist de validation)  
> **Application en ligne :** [https://sunuticket.vercel.app](https://sunuticket.vercel.app)  
> **Dépôt officiel :** [https://github.com/UCAK-DEV/Syst-me-de-billetterie-intelligente](https://github.com/UCAK-DEV/Syst-me-de-billetterie-intelligente)

---

## 📑 Sommaire

1. [Fiche d'identité & Objectifs du TP 2](#1-fiche-didentité--objectifs-du-tp-2)
2. [Le Pitch d'introduction (1 minute chrono)](#2-le-pitch-dintroduction-1-minute-chrono)
3. [Étape 1 : Docker & Conteneurisation Backend](#3-étape-1--docker--conteneurisation-backend)
4. [Étape 2 : Orchestration avec Docker Compose](#4-étape-2--orchestration-avec-docker-compose)
5. [Étape 3 : Déploiement en Ligne (Vercel & Serveur)](#5-étape-3--déploiement-en-ligne-vercel--serveur)
6. [Étape 4 : Démonstration en Direct (Checklist Post-Déploiement)](#6-étape-4--démonstration-en-direct-checklist-post-déploiement)
7. [Anticipation des Questions du Professeur & Réponses](#7-anticipation-des-questions-du-professeur--réponses)
8. [Anti-sèche des Commandes Terminal](#8-anti-sèche-des-commandes-terminal)

---

## 1. Fiche d'identité & Objectifs du TP 2

Le TP 1 ayant déjà validé la logique applicative (routes Express, authentification JWT, rôles, formulaires et tests d'intégration avec Supertest), le **TP 2 évalue l'industrialisation et la mise en production** :

- **Étape 1 — Dockerisation :** Création d'une image Docker sécurisée et optimisée pour le backend avec gestion du cache et isolation `.dockerignore`.
- **Étape 2 — Orchestration multi-conteneurs :** Assemblage du backend et de la base de données MongoDB via `docker-compose.yml`, gestion du réseau privé virtuel et persistance des données par volume.
- **Étape 3 — Déploiement Cloud / Serveur :** Déploiement du frontend React sur **Vercel** avec SSL/HTTPS et conteneurisation prête pour VPS d'école avec bridage mémoire strict (< 416 Mo).
- **Étape 4 — CI/CD & Automatisation :** Pipeline GitHub Actions avec conteneur de test MongoDB validant les builds à chaque push.
- **Étape 5 — Validation post-déploiement :** Vérification de bout en bout du parcours métier via la grille `CHECKLIST_DEPLOIEMENT.md`.

---

## 2. Le Pitch d'introduction (1 minute chrono)

*À réciter calmement et avec assurance dès le début de votre passage :*

> « Bonjour Monsieur. Lors du TP 1, nous avions présenté et validé le code métier du Service Utilisateurs ainsi que l'ensemble des tests unitaires et d'intégration.
> 
> Aujourd'hui, pour ce **TP 2**, notre objectif a été d'industrialiser notre solution pour la rendre déployable et exploitable en conditions réelles.
> 
> Nous avons conçu un **Dockerfile optimisé** sous Node.js 22 Alpine garantissant une image légère et protégée contre les fuites de secrets grâce au `.dockerignore`. Nous avons orchestré l'ensemble de la pile avec **Docker Compose**, en assurant la persistance des données via un volume dédié et la communication interne par DNS de service.
> 
> Enfin, la solution est déployée en ligne sur Vercel à l'adresse **sunuticket.vercel.app**, avec un pipeline d'intégration continue GitHub Actions au vert et une validation complète de notre grille post-déploiement que nous allons vous démontrer. »

---

## 3. Étape 1 : Docker & Conteneurisation Backend

### Décryptage du `backend/Dockerfile`

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
```

### Justifications techniques à donner au professeur :
1. **Pourquoi `node:22-alpine` ?**
   - Alpine Linux est une distribution minimaliste (~5 Mo à la base).
   - L'image finale est ultra-légère (~150 Mo contre près de 1 Go pour une Debian standard), réduisant les temps de téléchargement et la surface d'attaque aux vulnérabilités (CVE).
2. **Pourquoi `COPY package*.json ./` avant `COPY . .` ?**
   - C'est l'optimisation essentielle du **cache de calques (layers)** de Docker.
   - Les dépendances changent rarement, contrairement au code source. En copiant d'abord les fichiers de package, Docker met en cache le résultat de `npm ci`. Tant qu'aucune dépendance n'est ajoutée, Docker réutilise le cache en 1 seconde au lieu de tout réinstaller.
3. **Pourquoi `npm ci --omit=dev` plutôt que `npm install` ?**
   - `npm ci` (Clean Install) installe exactement les versions fixées dans `package-lock.json`, garantissant une reproductibilité absolue entre les machines de développement et le conteneur.
   - L'option `--omit=dev` exclut les outils réservés au développement et aux tests (Jest, Supertest, nodemon), allégeant l'image de production.
4. **Le rôle du fichier `backend/.dockerignore` :**
   - Il exclut `node_modules`, `.env`, `.git` et `coverage`.
   - **Point sécurité crucial :** Il empêche la fuite du fichier local `.env` (contenant les mots de passe et clés secrètes) dans l'image Docker publique ou partagée.

---

## 4. Étape 2 : Orchestration avec Docker Compose

### Décryptage du `docker-compose.yml`

```yaml
services:
  mongo:
    image: mongo:7
    container_name: billetterie-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./backend
    container_name: billetterie-backend
    ports:
      - "8000:8000"
    environment:
      PORT: 8000
      MONGO_URI: mongodb://mongo:27017/billetterie
      JWT_SECRET: secret_dev
      NODE_ENV: development
    depends_on:
      - mongo

volumes:
  mongo_data:
```

### Justifications techniques à donner au professeur :
1. **Communication inter-services & Résolution DNS :**
   - Docker Compose crée automatiquement un réseau bridge virtuel privé.
   - Le conteneur `backend` contacte la base via `mongodb://mongo:27017/billetterie`. Docker résout le nom d'hôte `mongo` directement vers l'adresse IP interne du conteneur de base de données. Aucune adresse IP statique n'est codée en dur.
2. **Persistance des données (`volumes: mongo_data:/data/db`) :**
   - Par nature, les conteneurs sont éphémères (toute donnée écrite sur leur système de fichiers local disparaît à leur destruction).
   - Le volume nommé `mongo_data` persiste les données sur l'hôte en dehors du cycle de vie du conteneur. Même en exécutant `docker compose down`, les utilisateurs, tickets et abonnements restent conservés.
3. **Ordre de démarrage (`depends_on: - mongo`) :**
   - Indique à Docker Compose de démarrer le service de base de données avant de lancer le conteneur applicatif backend.

---

## 5. Étape 3 : Déploiement en Ligne (Vercel & Serveur)

### Frontend (Vercel)
- **URL officielle :** [https://sunuticket.vercel.app](https://sunuticket.vercel.app)
- Déploiement automatisé connecté au dépôt GitHub.
- Certificat SSL/HTTPS géré nativement avec distribution mondiale sur CDN (temps de chargement < 200 ms).
- Variable d'environnement injectée au build : `VITE_API_URL`.

### Backend & Stratégie Serveur (VPS UCAK)
- Prévu pour tourner dans un environnement d'école avec contraintes strictes (`mem_limit`) documentées dans `DEPLOY_VPS.md` :
  - MongoDB 7 bridé à 256 Mo.
  - Backend API bridé à 128 Mo.
  - Consommation totale garantie inférieure à **416 Mo de RAM**, évitant tout plantage des services partagés du serveur.
- Sécurité réseau : le port MongoDB (27017) est strictement interne au réseau bridge et n'est pas exposé sur l'Internet public.

### Intégration Continue (CI/CD GitHub Actions)
- À chaque `git push` sur la branche `main` de `UCAK-DEV`, un pipeline automatisé :
  1. Monte une instance MongoDB de service éphémère.
  2. Lance les linters et analyses de sécurité.
  3. Exécute l'intégralité de la suite de tests avec `supertest`.
  4. Déclenche le re-déploiement uniquement si tous les indicateurs sont au vert.

---

## 6. Étape 4 : Démonstration en Direct (Checklist Post-Déploiement)

Suivez exactement ce parcours chronométré de 4 minutes devant le professeur pour valider chaque ligne de `CHECKLIST_DEPLOIEMENT.md` :

```text
1. Connexion Client  ➜  2. Affichage Titre & QR  ➜  3. Scan Caméra (Vert)  ➜  4. Anti-Fraude (Rouge)  ➜  5. Logs Terminal
```

### Action 1 : Connexion & Vérification du Frontend (30 secondes)
- Ouvrez le navigateur sur [https://sunuticket.vercel.app](https://sunuticket.vercel.app).
- Montrez le cadenas HTTPS et la responsivité.
- Connectez-vous avec le compte voyageur :
  - **Email :** `client@billetterie.com`
  - **Mot de passe :** `Admin1234`

### Action 2 : Consultation du Titre et du QR Code (30 secondes)
- Rendez-vous dans **« Mes Billets »**.
- Montrez les titres disponibles (TER, BRT, Dakar Dem Dikk).
- Cliquez sur **« Voir QR »** pour afficher le ticket `TCK-TER-2026-9104`.
- *Commentaire au professeur :* « L'affichage est épuré, sur fond blanc sans reflet ni animation laser, optimisé pour la lecture optique des caméras. »

### Action 3 : Scan et Validation en Temps Réel (1 minute)
- Sur un smartphone (ou dans un second onglet), ouvrez [`/scan`](https://sunuticket.vercel.app/scan).
- Visez le QR Code du client avec la caméra.
- **Résultat immédiat :** Grand écran vert **« Titre Valide »**, émission d'un signal sonore positif et affichage du type de titre.

### Action 4 : Preuve Anti-Fraude (Double Scan Rejeté) (1 minute)
- Rescannez immédiatement le **même** QR Code.
- **Résultat immédiat :** Grand écran rouge **« Titre déjà consommé »** avec horodatage.
- *Commentaire au professeur :* « Même si le voyageur duplique son ticket ou effectue une capture d'écran pour un tiers, le système bloque la réutilisation grâce à la mise à jour transactionnelle du statut du titre. »

### Action 5 : Preuve d'Exécution Conteneur & Logs (1 minute)
- Basculez sur votre terminal et affichez les logs en direct :
  ```bash
  docker compose logs -f backend
  ```
- Montrez au professeur les traces HTTP `200 OK` générées lors de la validation du scan et l'enregistrement de l'audit.

---

## 7. Anticipation des Questions du Professeur & Réponses

Voici les questions les plus probables que le professeur peut poser sur le TP 2, classées par domaine technique :

### Catégorie A : Dockerfile & Construction d'Images

#### Q1 : Pourquoi utilisez-vous `node:22-alpine` plutôt que `node:22` standard ?
> **Réponse :** « L'image standard est basée sur Debian et pèse près de 1 Go avec de nombreux packages inutiles en production. L'image Alpine ne pèse qu'une centaine de mégaoctets, se télécharge beaucoup plus rapidement et réduit drastiquement les failles de sécurité potentielles en minimisant le système d'exploitation embarqué. »

#### Q2 : Dans le Dockerfile, pourquoi séparer la copie de `package.json` et celle du reste du code ?
> **Réponse :** « C'est le mécanisme de mise en cache par calques de Docker. Docker exécute chaque instruction en créant une couche intermédiaire mise en cache. Comme les dépendances changent rarement comparé au code métier, copier `package*.json` avant d'exécuter `npm ci` permet à Docker de réutiliser le calque d'installation existant si les packages n'ont pas changé. Cela réduit le temps de build de plusieurs minutes à quelques secondes. »

#### Q3 : Quelle est la différence entre `npm install` et `npm ci` dans un conteneur ?
> **Réponse :** « `npm install` peut mettre à jour des dépendances mineures selon les plages définies dans `package.json`, ce qui peut provoquer des incohérences. À l'inverse, `npm ci` exige la présence de `package-lock.json` et installe strictement les versions exactes sans jamais modifier le fichier de lock. C'est la commande standard pour les environnements de CI/CD et de production. »

#### Q4 : Pourquoi ajouter `--omit=dev` à `npm ci` ?
> **Réponse :** « Cela permet de ne pas installer les `devDependencies` (comme Supertest, nodemon ou les outils de tests) dans le conteneur de production. Cela réduit la taille finale de l'image et évite d'embarquer du code superflu en ligne. »

#### Q5 : À quoi sert le fichier `.dockerignore` ? Que se passerait-il sans lui ?
> **Réponse :** « Le fichier `.dockerignore` indique à Docker les dossiers et fichiers de l'hôte à ne pas inclure dans le contexte de build. Sans lui, Docker copierait le dossier `node_modules` local (compilé pour la machine hôte et potentiellement incompatible avec Alpine), ainsi que l'historique `.git` et surtout le fichier `.env` local, ce qui représenterait une faille de sécurité majeure en exposant les secrets. »

---

### Catégorie B : Docker Compose, Réseaux & Volumes

#### Q6 : Comment le conteneur backend arrive-t-il à contacter MongoDB alors qu'aucune adresse IP n'est précisée ?
> **Réponse :** « Docker Compose crée un réseau virtuel partagé (bridge) et intègre un serveur DNS interne. Ce résolveur DNS mappe automatiquement le nom du service (`mongo`) défini dans le fichier compose vers l'adresse IP privée attribuée au conteneur de base de données. L'URI `mongodb://mongo:27017/billetterie` fonctionne ainsi sans configuration d'IP statique. »

#### Q7 : Qu'est-ce qu'un volume Docker et pourquoi est-il indispensable pour MongoDB ?
> **Réponse :** « Un conteneur est éphémère : si on le détruit, toutes les données stockées dans son système de fichiers interne sont perdues. Le volume nommé `mongo_data` monte un espace de stockage persistant géré par Docker sur le système de l'hôte, garantissant que les données de la base survivent aux redémarrages et reconstructions de conteneurs. »

#### Q8 : Quelle est la différence entre `docker compose down` et `docker compose down -v` ?
> **Réponse :** « `docker compose down` arrête et supprime les conteneurs et les réseaux, mais préserve intégralement les volumes et les données. L'option `-v` (volumes) demande à Docker de détruire également les volumes nommés, ce qui efface définitivement toutes les données de la base. »

#### Q9 : À quoi sert la directive `depends_on` ? Garantit-elle que la base est prête à recevoir des requêtes ?
> **Réponse :** « `depends_on` garantit l'ordre de démarrage des conteneurs : `mongo` est lancé avant `backend`. En revanche, elle attend uniquement que le conteneur soit démarré au niveau système, et non que le moteur MongoDB ait fini d'initialiser son port. Pour une attente stricte de disponibilité applicative, on peut coupler `depends_on` avec une condition de `healthcheck`. »

#### Q10 : Pourquoi le port 27017 de MongoDB n'est-il pas exposé en production sur le VPS ?
> **Réponse :** « Par principe de sécurité du moindre privilège et de défense en profondeur. Seul le backend a besoin de communiquer avec MongoDB via le réseau interne Docker. Exposer le port 27017 sur Internet ouvrirait une porte d'accès directe aux attaques par force brute ou aux scanners de vulnérabilités. »

---

### Catégorie C : Déploiement & Architecture de Production

#### Q11 : Comment sont gérées les variables d'environnement entre développement et production ?
> **Réponse :** « En développement local, nous utilisons un fichier `.env` ou les valeurs par défaut du compose de test. En production, les variables (`PORT`, `MONGO_URI`, `JWT_SECRET`, `NODE_ENV`) sont injectées directement au niveau de la plateforme d'hébergement ou via les secrets d'environnement du serveur sans jamais être versionnées dans Git. »

#### Q12 : Pourquoi avoir choisi Vercel pour le frontend plutôt que de le servir dans le même conteneur que le backend ?
> **Réponse :** « Découpler le frontend et le backend respecte l'architecture moderne JAMstack. Vercel distribue les fichiers statiques pré-compilés (HTML, CSS, JS) sur un réseau CDN mondial au plus proche des utilisateurs avec SSL automatique, déchargeant ainsi le serveur applicatif backend qui ne gère que les requêtes d'API dynamiques. »

#### Q13 : Comment avez-vous évité la surcharge de RAM sur le serveur partagé ?
> **Réponse :** « Nous avons configuré des directives strictes `mem_limit` dans notre configuration de production (`docker-compose.prod.yml`) : MongoDB est limité à 256 Mo et le backend à 128 Mo. La consommation maximale de notre pile est physiquement plafonnée à moins de 416 Mo de RAM, préservant les autres services hébergés sur le VPS. »

#### Q14 : Que se passe-t-il si un conteneur plante en production ?
> **Réponse :** « Grâce à la politique de redémarrage `restart: unless-stopped`, le démon Docker relance automatiquement le conteneur en cas d'erreur inattendue ou après un redémarrage du serveur hôte, assurant une haute disponibilité du service. »

---

### Catégorie D : Métier, Sécurité & Scénario Post-Déploiement

#### Q15 : Comment empêchez-vous la réutilisation frauduleuse d'un ticket scanné ?
> **Réponse :** « Dès qu'un QR Code est scanné par l'agent, le backend vérifie son statut en base de données. Si le ticket est actif, une transaction met à jour son statut à `CONSOMME` avec horodatage du passage. Tout scan ultérieur détecte immédiatement le statut consommé et renvoie un refus instantané. »

#### Q16 : Qu'avez-vous prévu contre la concurrence si deux personnes scannent le même ticket à la même seconde ?
> **Réponse :** « C'est le problème de la double dépense (*race condition*). Côté service de billetterie, nous utilisons un verrou transactionnel pessimiste (`LOCK.UPDATE` / transaction atomique) : la première requête prend le verrou, modifie le statut et commite ; la seconde requête lit la valeur mise à jour et est rejetée avec un code HTTP 409 Conflit. »

#### Q17 : Quels rôles d'utilisateurs gérez-vous et comment les droits sont-ils cloisonnés ?
> **Réponse :** « Nous gérons trois rôles via RBAC (*Role-Based Access Control*) encodés dans le jeton JWT :
> 1. **Client :** Achat de titres, consultation de ses billets et affichage de son QR Code.
> 2. **Agent :** Accès exclusif à la caméra de validation des titres et à l'historique des contrôles.
> 3. **Administrateur :** Supervision complète, gestion des utilisateurs, audit technique et métriques de fréquentation. »

---

## 8. Anti-sèche des Commandes Terminal

Si le professeur vous demande d'ouvrir un terminal et de lancer des commandes en direct, voici la référence exacte :

### Commandes Docker Fondamentales
```bash
# Vérifier les conteneurs actifs
docker ps

# Lister tous les conteneurs (y compris arrêtés)
docker ps -a

# Voir les images construites en local
docker images

# Consulter les logs d'un conteneur en temps réel
docker logs -f billetterie-backend

# Entrer dans le conteneur en cours d'exécution
docker exec -it billetterie-backend sh
```

### Commandes Docker Compose
```bash
# Lancer tous les services en arrière-plan avec reconstruction :
docker compose up --build -d

# Voir le statut des services orchestrés :
docker compose ps

# Voir les logs combinés ou d'un service précis :
docker compose logs -f
docker compose logs -f backend

# Arrêter les conteneurs sans perdre les données :
docker compose down

# Arrêter et réinitialiser complètement la base de données :
docker compose down -v
```

### Vérification des Ressources et Réseau
```bash
# Surveiller en temps réel la consommation CPU et RAM des conteneurs :
docker stats

# Inspecter le réseau interne créé par Docker Compose :
docker network ls
docker network inspect billetterie_default
```
