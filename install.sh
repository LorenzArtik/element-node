#!/usr/bin/env bash
# Element Node CMS — installer
# Uso: bash <(curl -fsSL https://raw.githubusercontent.com/LorenzArtik/element-node/main/install.sh)
set -euo pipefail

REPO="https://github.com/LorenzArtik/element-node.git"
DIR="${1:-element-node}"

echo ""
echo "  Element Node CMS — installazione"
echo "  ================================"
echo ""

command -v git >/dev/null || { echo "✗ git non trovato. Installalo e riprova."; exit 1; }
command -v node >/dev/null || { echo "✗ Node.js non trovato (richiesto >= 20). Installalo e riprova."; exit 1; }
NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
[ "$NODE_MAJOR" -ge 20 ] || { echo "✗ Node.js $NODE_MAJOR troppo vecchio (richiesto >= 20)."; exit 1; }

echo "→ Clono il repository in ./$DIR ..."
git clone --depth 1 "$REPO" "$DIR"
cd "$DIR"

echo "→ Installo le dipendenze (2-4 minuti)..."
npm install --no-audit --no-fund

if [ ! -f .env ]; then
  echo ""
  echo "→ Configurazione database MySQL/MariaDB"
  read -rp "  Host [127.0.0.1]: " DB_HOST; DB_HOST=${DB_HOST:-127.0.0.1}
  read -rp "  Porta [3306]: " DB_PORT; DB_PORT=${DB_PORT:-3306}
  read -rp "  Nome database: " DB_NAME
  read -rp "  Utente: " DB_USER
  read -rsp "  Password: " DB_PASS; echo ""
  read -rp "  URL pubblico del sito (es. https://miosito.it): " SITE_URL
  AUTH_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')
  cat > .env <<ENV
DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
AUTH_SECRET="${AUTH_SECRET}"
AUTH_URL="${SITE_URL}"
AUTH_TRUST_HOST="true"
UPLOAD_DIR="./public/uploads"
PUBLIC_URL="${SITE_URL}"
NODE_ENV="production"
PORT="3000"
ENV
  echo "  ✓ .env creato"
fi

echo "→ Creo lo schema del database..."
npx prisma db push

echo "→ Build di produzione..."
npm run build
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true
cp .env .next/standalone/.env 2>/dev/null || true

echo ""
echo "  ✓ Installazione completata!"
echo ""
echo "  Avvia con:   cd $DIR && npm start"
echo "  Poi apri il sito: al primo accesso parte il wizard /install"
echo "  (crea l'utente admin, configura il sito e, se vuoi, l'AI)."
echo ""
echo "  Licenza (aggiornamenti + supporto): https://elementnode.cloud/it/pricing"
echo "  Deploy su Plesk: vedi PLESK_DEPLOY.md nel repository."
echo ""
