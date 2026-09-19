# GUIDE DE DÉPLOIEMENT VPS (SANS NOM DE DOMAINE & SANS SURCHARGE RAM)

Ce guide est conçu pour déployer la billetterie sur votre **VPS d'école** en toute sécurité, **sans nom de domaine** et **sans risquer de saturer la mémoire (RAM)** des services existants.

---

## 1. Empreinte Mémoire & Sécurité Serveur

La stack est bridée par des plafonds stricts (`mem_limit`) configurés dans `docker-compose.prod.yml` :

| Conteneur | Rôle | Consommation réelle | Plafond garanti (`mem_limit`) |
| :--- | :--- | :--- | :--- |
| `billetterie-mongo` | Base MongoDB 7 | ~150 Mo | **256 Mo** (WiredTiger bridé à 150 Mo) |
| `billetterie-backend` | API Express (Node 22) | ~50 Mo | **128 Mo** |
| `billetterie-frontend` | Nginx statique | ~10 Mo | **32 Mo** |
| **TOTAL STACK** | **3 conteneurs** | **~210 Mo à 280 Mo** | **416 Mo MAXIMUM GARANTI** |

> [!NOTE]
> **Protection école :** La billetterie est physiquement incapable de dépasser 416 Mo. Le port MongoDB (27017) est strictement interne au réseau bridge et n'est pas exposé sur Internet. Le port web est mappé sur le port **`8080`** pour ne pas entrer en conflit avec le serveur web existant de l'école (port 80).

---

## 2. Procédure de Déploiement en 5 Commandes

Connectez-vous en SSH à votre VPS :
```bash
ssh user@<IP_DE_VOTRE_VPS>
```

### Étape 1 : Vérifier la mémoire disponible avant installation
```bash
free -h
```

### Étape 2 : Cloner ou mettre à jour le projet
```bash
git clone https://github.com/makhtar2/Syst-me-de-billetterie-intelligente.git billetterie
cd billetterie
```

### Étape 3 : Configurer l'environnement de production
Créez un fichier `.env` sur le VPS en remplaçant `<IP_DE_VOTRE_VPS>` par l'adresse IP réelle de votre serveur :
```bash
cat << 'EOF' > .env
PORT=8000
NODE_ENV=production
MONGO_URI=mongodb://mongo:27017/billetterie
JWT_SECRET=cle_secrete_production_ucak_2026_securisee
FRONTEND_PORT=8080
VITE_API_URL=http://<IP_DE_VOTRE_VPS>:8000
EOF
```

### Étape 4 : Lancer la stack conteneurisée
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Étape 5 : Vérifier la consommation mémoire en direct
```bash
docker stats --no-stream
```
Vous constaterez immédiatement que l'ensemble des conteneurs consomme moins de **300 Mo de RAM**.

---

## 3. Comment Accéder à l'Application sans Nom de Domaine ?

### Option A : Accès direct par Adresse IP (Simple et direct)
* **Application Web :** `http://<IP_DE_VOTRE_VPS>:8080`
* **API Backend :** `http://<IP_DE_VOTRE_VPS>:8000/api/auth/login`

### Option B : URL sans nom de domaine via le wildcard gratuit `nip.io`
Le service gratuit `nip.io` redirige automatiquement tout sous-domaine contenant une IP vers cette même IP :
* **Application Web :** `http://billetterie.<IP_DE_VOTRE_VPS>.nip.io:8080`
* Idéal pour montrer au professeur une URL de type nom de domaine sans avoir dépensé le moindre centime !

---

## 4. Commandes de Maintenance Rapides

* **Voir les conteneurs actifs :** `docker compose -f docker-compose.prod.yml ps`
* **Consulter les logs en direct :** `docker compose -f docker-compose.prod.yml logs -f`
* **Arrêter la billetterie sans toucher aux données :** `docker compose -f docker-compose.prod.yml down`
* **Redémarrer la billetterie :** `docker compose -f docker-compose.prod.yml up -d`
