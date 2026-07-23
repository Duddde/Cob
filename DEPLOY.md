# Déployer SnowBall sur Hostinger

SnowBall est une application **Node.js** (serveur Express + fichiers statiques). Elle a
besoin d'un environnement capable d'exécuter un processus Node en continu. Chez
Hostinger, cela dépend de votre offre :

| Offre Hostinger | Node.js ? | Marche à suivre |
|---|---|---|
| **VPS** | ✅ Oui | Option A ci-dessous (recommandé) |
| **Cloud / hPanel avec « Applications Node.js »** | ✅ Si disponible dans votre hPanel | Option B |
| **Hébergement web mutualisé (PHP)** | ❌ Non | Voir « Option C » |

Aucune clé d'API n'est nécessaire. Le serveur écoute sur `process.env.PORT`
(3000 par défaut). Les prix en direct exigent des requêtes HTTPS sortantes vers
`api.coingecko.com` et `query1.finance.yahoo.com` ; si elles sont bloquées,
l'app fonctionne quand même avec les prix indicatifs embarqués.

## Option A — VPS Hostinger (recommandé)

### Le raccourci : une seule commande

Connectez-vous en SSH (`ssh root@VOTRE_IP`) puis :

```bash
curl -fsSL https://raw.githubusercontent.com/duddde/cob/main/scripts/deploy-vps.sh | bash -s -- votredomaine.fr
```

Le script installe Node 22 si besoin, clone/actualise le code, lance l'app en
service pm2 (redémarrage automatique au reboot) et configure nginx pour votre
domaine. Relancez la même commande pour mettre à jour. Il ne reste qu'à pointer
le DNS vers le VPS et, pour le HTTPS, exécuter la commande certbot affichée en
fin de script.

### Ou pas à pas, à la main

```bash
# 1. Connexion au VPS
ssh root@VOTRE_IP

# 2. Node.js ≥ 18 (ici : Node 22 LTS via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git nginx

# 3. Récupérer le code
git clone https://github.com/duddde/cob.git /opt/snowball
cd /opt/snowball
npm ci --omit=dev

# 4. Lancer en service avec pm2 (redémarre tout seul au reboot)
npm install -g pm2
PORT=3000 pm2 start server.js --name snowball
pm2 save
pm2 startup   # suivre l'instruction affichée
```

### Reverse proxy nginx + domaine

```nginx
# /etc/nginx/sites-available/snowball
server {
    listen 80;
    server_name votredomaine.fr www.votredomaine.fr;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/snowball /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# HTTPS gratuit (Let's Encrypt)
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d votredomaine.fr -d www.votredomaine.fr
```

Pointez le DNS du domaine (enregistrement A) vers l'IP du VPS depuis hPanel.

### Mettre à jour l'app

```bash
cd /opt/snowball && git pull && npm ci --omit=dev && pm2 restart snowball
```

## Option B — « Applications Node.js » dans hPanel

Si votre plan propose la section **Site web → Applications Node.js** :

1. Créez une application Node.js, version **18 ou plus**.
2. Reliez le dépôt Git `https://github.com/duddde/cob` (ou téléversez les fichiers).
3. Commande d'installation : `npm ci --omit=dev` — commande de démarrage : `node server.js`.
4. Ne définissez pas de PORT manuellement : la plateforme injecte `PORT` et
   `server.js` le lit automatiquement.
5. Associez votre domaine à l'application dans hPanel.

## Option C — Hébergement mutualisé (PHP uniquement)

Les plans mutualisés Hostinger n'exécutent pas de serveur Node persistant. Deux issues :

- **Passer sur un VPS Hostinger** (à partir du premier palier, largement suffisant :
  SnowBall consomme ~50 Mo de RAM) et suivre l'option A.
- **Déployer la version statique** — les projections sont calculées dans le
  navigateur, donc l'interface fonctionne sans serveur Node :

  ```bash
  npm run build:static
  ```

  puis téléversez le **contenu** du dossier `dist/` dans
  hPanel → Gestionnaire de fichiers → `public_html` (ou via FTP). C'est tout.
  Seule limite : les prix affichés sont les instantanés embarqués (badge « prix
  indicatif ») — sans serveur, les API de prix refusent les requêtes navigateur
  (CORS). Les projections, la répartition et toutes les fonctionnalités restent
  identiques.

## Vérification après déploiement

- `https://votredomaine.fr` affiche le dashboard.
- `https://votredomaine.fr/api/assets` renvoie le catalogue JSON.
- `https://votredomaine.fr/api/prices?currency=eur` renvoie des prix avec
  `"live": true` (ou `false` si les API externes sont bloquées — l'app reste utilisable).
