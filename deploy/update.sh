#!/bin/bash
set -e
# ============================================================
# DartEvent Manager — Update-Script fuer den Produktionsserver
# Aufruf (auf dem Server): sudo bash /var/www/dartsturnier/deploy/update.sh
# ============================================================

APP_DIR="/var/www/dartsturnier"
SERVICE_NAME="dartevent"

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Bitte als root ausfuehren: sudo bash update.sh${NC}"
  exit 1
fi

echo -e "${YELLOW}=== DartEvent Update gestartet ===${NC}"
echo ""

# --- 1. Neuesten Code holen ---
echo -e "${GREEN}>>> git pull (main)...${NC}"
cd "$APP_DIR"
git fetch origin
git checkout main
git pull origin main

# --- 2. Backend Dependencies aktualisieren ---
echo -e "${GREEN}>>> Backend: npm install...${NC}"
cd "$APP_DIR/backend"
npm install --omit=dev

# --- 3. Frontend bauen ---
echo -e "${GREEN}>>> Frontend: npm install + build...${NC}"
cd "$APP_DIR/frontend"
npm install
npm run build

# --- 4. Backend neustarten ---
echo -e "${GREEN}>>> Service neustarten...${NC}"
systemctl restart "$SERVICE_NAME"
sleep 2

# --- 5. Status prüfen ---
if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo -e "${GREEN}>>> $SERVICE_NAME läuft. Update erfolgreich!${NC}"
else
  echo -e "${RED}>>> FEHLER: $SERVICE_NAME ist nicht gestartet!${NC}"
  echo "Logs: journalctl -u $SERVICE_NAME -n 50"
  exit 1
fi

echo ""
echo -e "${GREEN}=== Update abgeschlossen ===${NC}"
echo "Logs live ansehen: journalctl -u $SERVICE_NAME -f"
