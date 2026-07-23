#!/usr/bin/env bash
# Installe ou met à jour SnowBall sur un VPS Debian/Ubuntu (Hostinger inclus).
#
#   Usage : bash deploy-vps.sh [votredomaine.fr]
#
# Idempotent : relancer le script met à jour le code et redémarre le service.
# Sans argument, l'app tourne sur http://IP:3000 ; avec un domaine, nginx est
# configuré en reverse proxy (HTTPS : voir le message de fin).
set -euo pipefail

REPO="https://github.com/duddde/cob.git"
DIR="/opt/snowball"
DOMAIN="${1:-}"

echo "── SnowBall : déploiement VPS ──"

# Node.js ≥ 18 (installe Node 22 LTS si absent ou trop vieux)
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  echo "→ Installation de Node.js 22…"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
apt-get install -y git nginx >/dev/null

# Code
if [ -d "$DIR/.git" ]; then
  echo "→ Mise à jour du code…"
  git -C "$DIR" pull --ff-only
else
  echo "→ Clonage du dépôt…"
  git clone "$REPO" "$DIR"
fi
cd "$DIR"
npm ci --omit=dev

# Service pm2 (démarre au boot)
command -v pm2 >/dev/null 2>&1 || npm install -g pm2
if pm2 describe snowball >/dev/null 2>&1; then
  pm2 restart snowball --update-env
else
  PORT=3000 pm2 start server.js --name snowball
fi
pm2 save
pm2 startup systemd -u "$(whoami)" --hp "$HOME" >/dev/null 2>&1 || true

# Reverse proxy nginx si un domaine est fourni
if [ -n "$DOMAIN" ]; then
  echo "→ Configuration nginx pour $DOMAIN…"
  cat > /etc/nginx/sites-available/snowball <<NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
NGINX
  ln -sf /etc/nginx/sites-available/snowball /etc/nginx/sites-enabled/snowball
  nginx -t && systemctl reload nginx
  echo ""
  echo "✔ http://$DOMAIN est servi (pensez à pointer le DNS vers ce VPS)."
  echo "  Pour le HTTPS gratuit :"
  echo "  apt-get install -y certbot python3-certbot-nginx && certbot --nginx -d $DOMAIN -d www.$DOMAIN"
else
  echo ""
  echo "✔ SnowBall tourne sur le port 3000 (http://$(hostname -I | awk '{print $1}'):3000)."
  echo "  Relancez avec un domaine pour configurer nginx : bash deploy-vps.sh votredomaine.fr"
fi
